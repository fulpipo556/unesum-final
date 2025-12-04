const db = require('../models'); // Importa desde el index de modelos
const Syllabus = db.Syllabus;   // Accede al modelo Syllabus
const Usuario = db.Usuario;     // Necesario para incluir datos del creador
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// --- CREAR UN NUEVO SYLLABUS ---
exports.create = async (req, res) => {
  try {
    const { nombre, periodo, materias, datos_syllabus } = req.body;
    const usuario_id = req.user.id; 

    if (!nombre || !periodo || !materias || !datos_syllabus) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, periodo, materias y datos_syllabus son obligatorios'
      });
    }
    
    const nuevoSyllabus = await Syllabus.create({
      nombre,
      periodo,
      materias,
      datos_syllabus,
      usuario_id
    });
    
    return res.status(201).json({
      success: true,
      message: 'Syllabus creado exitosamente',
      data: nuevoSyllabus
    });
  } catch (error) {
    console.error('Error al crear syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear el syllabus',
      error: error.message
    });
  }
};

// --- OBTENER TODOS LOS SYLLABI (SOLO ADMIN) ---
exports.getAll = async (req, res) => {
  try {
    const syllabi = await Syllabus.findAll({
      order: [['updated_at', 'DESC']],
      include: {
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos']
      }
    });
    return res.status(200).json({ success: true, data: syllabi });
  } catch (error) {
    console.error('Error al obtener syllabi:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener los syllabi',
      error: error.message
    });
  }
};

// --- OBTENER UN SYLLABUS POR ID ---
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const syllabus = await Syllabus.findByPk(id, {
      include: {
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos']
      }
    });
    
    if (!syllabus) {
      return res.status(404).json({ success: false, message: `Syllabus con ID ${id} no encontrado` });
    }
    
    return res.status(200).json({ success: true, data: syllabus });
  } catch (error) {
    console.error('Error al obtener syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener el syllabus',
      error: error.message
    });
  }
};

// --- ¡NUEVA FUNCIÓN AÑADIDA! ---
// --- OBTENER LOS SYLLABI DEL USUARIO AUTENTICADO PARA EL ÚLTIMO PERIODO ---
exports.getMine = async (req, res) => {
  try {
    const usuario_id = req.user.id; // ID del profesor que hace la petición

    // 1. Encontrar cuál es el "último periodo" basándonos en el orden alfabético descendente.
    const ultimoPeriodoEntry = await Syllabus.findOne({
      attributes: ['periodo'],
      order: [['periodo', 'DESC']],
      limit: 1 // Aseguramos que solo traiga uno
    });

    // Si no hay ningún syllabus en toda la base de datos, no hay nada que mostrar.
    if (!ultimoPeriodoEntry) {
      return res.status(200).json({ 
          success: true, 
          data: {
              periodo: "N/A", // Indicamos que no se encontró un periodo
              syllabi: []
          } 
      });
    }

    const ultimoPeriodo = ultimoPeriodoEntry.periodo;

    // 2. Buscar todos los syllabi que pertenezcan a ESE profesor y a ESE último periodo.
    const syllabi = await Syllabus.findAll({
      where: {
        usuario_id: usuario_id,
        periodo: ultimoPeriodo
      },
      order: [['updated_at', 'DESC']],
      // No es estrictamente necesario incluir el creador, pero es buena práctica
      include: { 
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos']
      }
    });

    return res.status(200).json({ 
      success: true, 
      data: {
        periodo: ultimoPeriodo,
        syllabi: syllabi
      }
    });

  } catch (error) {
    console.error('Error al obtener los syllabi del profesor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener los syllabi del profesor',
      error: error.message
    });
  }
};

// --- ACTUALIZAR UN SYLLABUS ---
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRol = req.user.rol;
    
    const syllabus = await Syllabus.findByPk(id);
    
    if (!syllabus) {
      return res.status(404).json({ success: false, message: `Syllabus con ID ${id} no encontrado` });
    }

    // ¡VERIFICACIÓN DE PERMISOS! Solo el creador o un admin puede editar.
    if (syllabus.usuario_id !== userId && userRol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'No tienes permiso para editar este syllabus.' });
    }
    
    await syllabus.update(req.body);
    
    return res.status(200).json({
      success: true,
      message: 'Syllabus actualizado exitosamente',
      data: syllabus
    });
  } catch (error) {
    console.error('Error al actualizar syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al actualizar el syllabus',
      error: error.message
    });
  }
};

// --- ELIMINAR UN SYLLABUS (Borrado Lógico) ---
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRol = req.user.rol;

    const syllabus = await Syllabus.findByPk(id);
    
    if (!syllabus) {
      return res.status(404).json({ success: false, message: `Syllabus con ID ${id} no encontrado` });
    }

    // ¡VERIFICACIÓN DE PERMISOS!
    if (syllabus.usuario_id !== userId && userRol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este syllabus.' });
    }
    
    await syllabus.destroy();
    
    return res.status(200).json({ success: true, message: 'Syllabus eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al eliminar el syllabus',
      error: error.message
    });
  }
};

// --- SUBIR Y PROCESAR DOCUMENTO WORD DE SYLLABUS ---
exports.uploadDocument = async (req, res) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    const filePath = req.file.path;
    const { nombre, periodo, materias } = req.body;
    const usuario_id = req.user.id;

    if (!nombre || !periodo || !materias) {
      // Eliminar el archivo si falta información
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, periodo y materias son obligatorios'
      });
    }

    // Leer el documento Word con conversión HTML para poder procesar tablas
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;
    
    // También extraer el texto plano para referencia
    const textResult = await mammoth.extractRawText({ path: filePath });
    const text = textResult.value;

    console.log('📄 Primeros 2000 caracteres del HTML:', html.substring(0, 2000));
    console.log('📄 Primeros 2000 caracteres del texto:', text.substring(0, 2000));
    
    // Buscar específicamente "Unidades temáticas" en el texto completo
    const buscandoUnidades = text.toLowerCase().includes('unidades') || text.toLowerCase().includes('temáticas');
    console.log('🔍 ¿Contiene "unidades" o "temáticas"?', buscandoUnidades);
    
    // Extraer todas las líneas que contengan palabras clave
    const lineasConUnidades = text.split('\n').filter(line => 
      line.toLowerCase().includes('unidad') || 
      line.toLowerCase().includes('temática') ||
      line.toLowerCase().includes('contenido') ||
      line.toLowerCase().includes('resultado') ||
      line.toLowerCase().includes('criterio') ||
      line.toLowerCase().includes('instrumento')
    );
    console.log('📋 Líneas con palabras clave:', lineasConUnidades.slice(0, 10));

    // Función para extraer texto de HTML sin etiquetas
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Función para normalizar títulos (eliminar espacios extras, caracteres especiales)
    const normalizeTitulo = (titulo) => {
      return titulo
        .replace(/\s+/g, ' ')
        .replace(/[:：]/g, '')
        .trim();
    };

    // LISTA DE CAMPOS OBLIGATORIOS que deben estar en el syllabus
    const camposObligatorios = [
      'DATOS GENERALES',
      'RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES',
      'Unidades temáticas',
      'CONTENIDOS',
      'Resultados de aprendizaje',
      'Criterios de evaluación',
      'Instrumentos de evaluación',
      'Total horas por componente',
      'Total horas vinculación/prácticas preprofesionales',
      'Total horas de la asignatura',
      'Evaluación de Recuperación',
      'VISADO',
      'DECANO/A',
      'DIRECTOR/A',
      'COORDINADOR/A',
      'DOCENTE'
    ];
    
    // PATRONES ALTERNATIVOS: Buscar variaciones de los campos (por si están separados o con diferente formato)
    const patronesBusqueda = [
      { variantes: ['unidades temáticas', 'unidad temática', 'unidades', 'temáticas'], campo: 'Unidades temáticas' },
      { variantes: ['contenidos', 'contenido'], campo: 'CONTENIDOS' },
      { variantes: ['resultados de aprendizaje', 'resultado de aprendizaje', 'resultados aprendizaje'], campo: 'Resultados de aprendizaje' },
      { variantes: ['criterios de evaluación', 'criterio de evaluación', 'criterios evaluación'], campo: 'Criterios de evaluación' },
      { variantes: ['instrumentos de evaluación', 'instrumento de evaluación', 'instrumentos evaluación'], campo: 'Instrumentos de evaluación' },
      { variantes: ['total horas por componente', 'total horas componente'], campo: 'Total horas por componente' },
      { variantes: ['total horas vinculación', 'total horas prácticas preprofesionales'], campo: 'Total horas vinculación/prácticas preprofesionales' },
      { variantes: ['total horas de la asignatura', 'total horas asignatura'], campo: 'Total horas de la asignatura' },
      { variantes: ['evaluación de recuperación', 'evaluación recuperación'], campo: 'Evaluación de Recuperación' }
    ];

    // Extraer títulos y contenido de las tablas
    const titulos = [];
    const contenidoCompleto = {};
    const titulosSet = new Set(); // Para evitar duplicados
    const seccionesPrincipales = []; // Para guardar los títulos de sección principales
    const seccionActual = { nombre: null, campos: [] }; // Para rastrear a qué sección pertenece cada campo
    
    // Primero extraer títulos de sección del texto plano
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Secciones esperadas en un syllabus
    const seccionesEsperadas = [
      'DATOS GENERALES',
      'ESTRUCTURA DE LA ASIGNATURA',
      'RESULTADOS Y EVALUACIÓN',
      'VISADO'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineUpper = line.toUpperCase();
      
      // Detectar títulos de sección con varios formatos:
      // - "1. DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA"
      // - "2. ESTRUCTURA DE LA ASIGNATURA"
      // - "RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES"
      // - "3 VISADO"
      
      const esSeccionNumerada = /^\d+\.?\-?\s+[A-ZÁÉÍÓÚÑ\s\/Y]+$/.test(line) && 
                               line.length >= 10 && 
                               line.length < 150;
      
      const esSeccionMayusculas = /^[A-ZÁÉÍÓÚÑ\s\/Y]{15,150}$/.test(line) && 
                                   !line.includes('NOMBRE:') && 
                                   !line.includes('FECHA:') &&
                                   !line.includes('FIRMA') &&
                                   !line.includes('MSc') &&
                                   !line.includes('Mg') &&
                                   !line.includes('PhD') &&
                                   !line.includes('Lic.');
      
      // Verificar si contiene alguna sección esperada
      const esSeccionConocida = seccionesEsperadas.some(seccion => lineUpper.includes(seccion));
      
      if ((esSeccionNumerada || esSeccionMayusculas || esSeccionConocida) && line.length > 10) {
        seccionesPrincipales.push(line);
        seccionActual.nombre = line;
        
        const tituloLimpio = line.replace(/^\d+\.?\-?\s*/, '').trim();
        
        if (!titulosSet.has(tituloLimpio)) {
          titulosSet.add(tituloLimpio);
          titulos.push(tituloLimpio);
          contenidoCompleto[tituloLimpio] = '';
          console.log(`📌 SECCIÓN PRINCIPAL: ${tituloLimpio}`);
        }
      }
    }
    
    console.log(`\n✓ Encontradas ${seccionesPrincipales.length} secciones principales\n`);
    
    // Expresión regular para encontrar TODAS las tablas completas
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
    const tableRowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis; // Captura tanto <td> como <th>
    
    let tableMatch;
    let tableCount = 0;
    
    // Procesar cada tabla
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      tableCount++;
      const tableHtml = tableMatch[1];
      
      let rowMatch;
      let rowCount = 0;
      
      // Procesar cada fila de la tabla
      while ((rowMatch = tableRowRegex.exec(tableHtml)) !== null) {
        rowCount++;
        const rowHtml = rowMatch[1];
        const cells = [];
        
        let cellMatch;
        // Extraer todas las celdas de la fila (tanto <td> como <th>)
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          const cellContent = stripHtml(cellMatch[1]);
          if (cellContent) { // Solo agregar si no está vacío
            cells.push(cellContent);
          }
        }
        
        // Si la fila tiene celdas, procesar
        if (cells.length > 0) {
          const primeraColumna = cells[0].trim();
          
          // MEJORADO: Detectar si la primera celda es un campo importante
          const esCampoImportante = primeraColumna.length > 3 && (
            primeraColumna.toLowerCase().includes('total') ||
            primeraColumna.toLowerCase().includes('evaluación') ||
            primeraColumna.toLowerCase().includes('hora') ||
            /^[A-ZÁÉÍÓÚÑ]/.test(primeraColumna) // Empieza con mayúscula
          );
          
          // Caso 1: Fila con 2 columnas (campo: valor)
          if (cells.length === 2) {
            const titulo = normalizeTitulo(primeraColumna);
            
            // Validar que el título no sea vacío, muy corto, o solo números
            if (titulo && titulo.length > 2 && !/^[\d\s\-:]+$/.test(titulo)) {
              if (!titulosSet.has(titulo)) {
                titulosSet.add(titulo);
                titulos.push(titulo);
                contenidoCompleto[titulo] = cells[1].trim();
                
                // Guardar también con el título original
                if (primeraColumna !== titulo) {
                  contenidoCompleto[primeraColumna] = cells[1].trim();
                }
              }
            }
          }
          // Caso 2: Fila con múltiples columnas
          else if (cells.length > 2) {
            // Si la primera columna es un campo importante (ej: "Total horas por componente")
            // la guardamos como un campo único con todas las celdas restantes como valor
            if (esCampoImportante) {
              const titulo = normalizeTitulo(primeraColumna);
              if (titulo && titulo.length > 2 && !titulosSet.has(titulo)) {
                titulosSet.add(titulo);
                titulos.push(titulo);
                // Unir todas las celdas restantes como valor
                const valor = cells.slice(1).filter(c => c.trim()).join(' | ');
                contenidoCompleto[titulo] = valor;
                
                if (primeraColumna !== titulo) {
                  contenidoCompleto[primeraColumna] = valor;
                }
              }
            } else {
              // Si no, guardar cada celda como un posible campo (encabezados)
              for (let i = 0; i < cells.length; i++) {
                const campo = cells[i].trim();
                const titulo = normalizeTitulo(campo);
                
                // Validar que sea un título válido
                if (titulo && titulo.length > 2 && !/^[\d\s\-:]+$/.test(titulo)) {
                  if (!titulosSet.has(titulo)) {
                    titulosSet.add(titulo);
                    titulos.push(titulo);
                    contenidoCompleto[titulo] = ''; // Encabezados sin contenido inicial
                    
                    if (campo !== titulo) {
                      contenidoCompleto[campo] = '';
                    }
                  }
                }
              }
            }
          }
          // Caso 3: Fila con 1 columna (puede ser un encabezado o título)
          else if (cells.length === 1) {
            const titulo = normalizeTitulo(primeraColumna);
            
            // Si parece ser un título importante (mayúsculas, longitud razonable, o tiene palabras clave)
            if (titulo && titulo.length > 2 && (
              primeraColumna === primeraColumna.toUpperCase() ||
              esCampoImportante
            )) {
              if (!titulosSet.has(titulo)) {
                titulosSet.add(titulo);
                titulos.push(titulo);
                contenidoCompleto[titulo] = '';
                
                if (primeraColumna !== titulo) {
                  contenidoCompleto[primeraColumna] = '';
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`✓ Procesadas ${tableCount} tablas`);
    console.log(`✓ Extraídos ${titulos.length} campos hasta ahora`);
    console.log(`✓ Secciones principales encontradas: ${seccionesPrincipales.length}`);
    
    // PASO 1: EXTRACCIÓN ULTRA-AGRESIVA - Extraer TODO el texto del HTML
    const todoElTextoHTML = stripHtml(html);
    const palabrasHTML = todoElTextoHTML.split(/\s+/).filter(p => p.length > 0);
    
    console.log(`✓ Palabras totales extraídas del HTML: ${palabrasHTML.length}`);
    console.log('Primeras 50 palabras:', palabrasHTML.slice(0, 50).join(' '));
    
    // PASO 2: Buscar ESPECÍFICAMENTE cada campo obligatorio con sus variantes
    for (const patron of patronesBusqueda) {
      let encontrado = false;
      let varianteEncontrada = '';
      
      // Buscar cada variante
      for (const variante of patron.variantes) {
        const varianteLower = variante.toLowerCase();
        
        // Buscar en texto plano
        if (text.toLowerCase().includes(varianteLower)) {
          encontrado = true;
          varianteEncontrada = variante;
          break;
        }
        
        // Buscar en HTML
        if (html.toLowerCase().includes(varianteLower)) {
          encontrado = true;
          varianteEncontrada = variante;
          break;
        }
        
        // Buscar palabras individuales (para texto rotado que puede estar separado)
        const palabras = variante.split(' ');
        let todasLasPalabrasEncontradas = true;
        for (const palabra of palabras) {
          if (palabra.length > 3) { // Solo palabras significativas
            if (!text.toLowerCase().includes(palabra.toLowerCase()) && 
                !html.toLowerCase().includes(palabra.toLowerCase())) {
              todasLasPalabrasEncontradas = false;
              break;
            }
          }
        }
        if (todasLasPalabrasEncontradas && palabras.length > 0) {
          encontrado = true;
          varianteEncontrada = variante;
          break;
        }
      }
      
      if (encontrado) {
        const campoNormalizado = normalizeTitulo(patron.campo);
        if (!titulosSet.has(campoNormalizado)) {
          titulosSet.add(campoNormalizado);
          titulos.push(patron.campo);
          contenidoCompleto[patron.campo] = '';
          console.log(`✅ Campo encontrado: "${patron.campo}" (variante: "${varianteEncontrada}")`);
        }
      }
    }
    
    // También buscar los campos obligatorios simples (VISADO, etc.)
    for (const campoObligatorio of camposObligatorios) {
      const campoNormalizado = normalizeTitulo(campoObligatorio);
      const campoLower = campoObligatorio.toLowerCase();
      
      if ((text.toLowerCase().includes(campoLower) || html.toLowerCase().includes(campoLower)) 
          && !titulosSet.has(campoNormalizado)) {
        titulosSet.add(campoNormalizado);
        titulos.push(campoObligatorio);
        contenidoCompleto[campoObligatorio] = '';
        console.log(`✅ Campo obligatorio encontrado: ${campoObligatorio}`);
      }
    }
    
    // PASO 3: Extraer TODO el texto de TODAS las etiquetas HTML
    const allTextRegex = />([^<]+)</g;
    let textMatch;
    const todosLosTextos = new Set();
    
    while ((textMatch = allTextRegex.exec(html)) !== null) {
      const textoExtraido = textMatch[1].trim();
      if (textoExtraido && textoExtraido.length > 2) {
        todosLosTextos.add(textoExtraido);
      }
    }
    
    console.log(`✓ Textos únicos extraídos: ${todosLosTextos.size}`);
    
    // Procesar cada texto extraído
    for (const texto of todosLosTextos) {
      // Detectar campos importantes
      const esImportante = (
        texto.toLowerCase().includes('unidades') ||
        texto.toLowerCase().includes('temáticas') ||
        texto.toLowerCase().includes('contenido') ||
        texto.toLowerCase().includes('resultado') ||
        texto.toLowerCase().includes('criterio') ||
        texto.toLowerCase().includes('instrumento') ||
        texto.toLowerCase().includes('evaluación') ||
        texto.toLowerCase().includes('aprendizaje') ||
        texto.toLowerCase().includes('total') ||
        texto.toLowerCase().includes('hora') ||
        texto.toLowerCase().includes('recuperación') ||
        (texto.length > 5 && texto.length < 100 && /^[A-ZÁÉÍÓÚÑ]/.test(texto))
      );
      
      if (esImportante) {
        const titulo = normalizeTitulo(texto);
        if (titulo && titulo.length > 2 && !titulosSet.has(titulo) && !/^[\d\s\-:]+$/.test(titulo)) {
          titulosSet.add(titulo);
          titulos.push(texto);
          contenidoCompleto[texto] = '';
          console.log(`✓ Campo importante agregado: ${texto}`);
        }
      }
    }
    
    console.log(`✓ Después de extracción ultra-agresiva: ${titulos.length} campos totales`);
    
    // PASO ADICIONAL: Extraer también del texto plano líneas importantes que no estén en tablas
    // Esto captura campos como "Evaluación de Recuperación", títulos de sección, etc.
    const textLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];
      
      // Detectar líneas que parecen ser títulos o campos importantes
      const esLineaImportante = (
        // Líneas que terminan con ":"
        line.endsWith(':') ||
        // Líneas completamente en mayúsculas (títulos de sección)
        (line === line.toUpperCase() && line.length > 3 && line.length < 100 && !/^\d+$/.test(line)) ||
        // Líneas que empiezan con número y punto (ej: "1. DATOS GENERALES", "3. VISADO")
        line.match(/^\d+\.\s+[A-ZÁÉÍÓÚÑ]/) ||
        // Líneas que contienen "Total" (campos de totales)
        line.toLowerCase().includes('total ') ||
        // Líneas que contienen "Evaluación"
        line.toLowerCase().includes('evaluación') ||
        // Líneas con formato "PALABRA/PALABRA" en mayúsculas
        /^[A-ZÁÉÍÓÚÑ\/\s]+$/.test(line) && line.includes('/')
      );

      if (esLineaImportante) {
        const titulo = normalizeTitulo(line.replace(/:$/, ''));
        
        if (titulo && titulo.length > 2 && !titulosSet.has(titulo)) {
          titulosSet.add(titulo);
          titulos.push(titulo);
          
          // Intentar obtener el contenido de la línea siguiente
          const contenido = (i + 1 < textLines.length) ? textLines[i + 1] : '';
          contenidoCompleto[titulo] = contenido;
          
          // Guardar también con el título original
          if (line !== titulo) {
            contenidoCompleto[line.replace(/:$/, '')] = contenido;
          }
        }
      }
    }
    
    // ========== EXTRACCIÓN ESPECÍFICA PARA LA SECCIÓN DE VISADO ==========
    console.log('\n=== EXTRAYENDO SECCIÓN DE VISADO ===\n');
    
    // Buscar el índice donde empieza VISADO en el texto
    const visadoIndex = text.search(/(\d+\.?\s*)?VISADO/i);
    
    if (visadoIndex !== -1) {
      // Extraer todo el texto desde VISADO hasta el final
      const visadoText = text.substring(visadoIndex);
      const siguienteSeccion = visadoText.substring(10).search(/^\d+\.\s+[A-ZÁÉÍÓÚÑ]/m);
      const textoVisado = siguienteSeccion !== -1 
        ? visadoText.substring(0, siguienteSeccion + 10)
        : visadoText.substring(0, 2000); // Tomar máximo 2000 caracteres
      
      console.log('📄 Texto de VISADO extraído (primeros 800 chars):', textoVisado.substring(0, 800));
      
      // Agregar el título VISADO
      if (!titulosSet.has('VISADO')) {
        titulosSet.add('VISADO');
        titulos.push('VISADO');
        contenidoCompleto['VISADO'] = '';
      }
      
      // Extraer nombres con títulos académicos del VISADO
      // Buscar patrones como "Lic. Alexandra Monserrate Pionce Parrales, Mg. Duie."
      const nombresConTitulos = textoVisado.match(/((?:Lic\.|Ing\.|Dr\.|PhD|MSc|Mg\.|MBA)\.?\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,5}(?:,\s*(?:Mg|MSc|PhD|MBA|MSIG)\.?)?)/gi);
      
      if (nombresConTitulos && nombresConTitulos.length > 0) {
        console.log(`\n✓ Encontrados ${nombresConTitulos.length} nombres en VISADO:\n`);
        
        nombresConTitulos.forEach((nombre, index) => {
          const nombreLimpio = nombre.trim();
          const campo = `Persona ${index + 1} - VISADO`;
          
          if (!titulosSet.has(campo)) {
            titulosSet.add(campo);
            titulos.push(campo);
            contenidoCompleto[campo] = nombreLimpio;
            console.log(`✅ ${campo}: ${nombreLimpio}`);
          }
        });
      }
      
      // Patrones específicos para cada cargo en VISADO
      const cargosVisado = [
        { patron: /DECANO\/A\s+DE\s+FACULTAD/i, campo: 'DECANO/A DE FACULTAD' },
        { patron: /DIRECTOR\/A\s+ACADÉMICO\/A/i, campo: 'DIRECTOR/A ACADÉMICO/A' },
        { patron: /DIRECTOR\/A\s+DE\s+CARRERA/i, campo: 'DIRECTOR/A DE CARRERA' },
        { patron: /COORDINADOR\/A\s+DE\s+CARRERA/i, campo: 'COORDINADOR/A DE CARRERA' },
        { patron: /DOCENTE(?!\s*:)/i, campo: 'DOCENTE' }
      ];
      
      // Buscar cada cargo y extraer el contenido asociado
      for (const { patron, campo } of cargosVisado) {
        const cargoMatch = textoVisado.match(patron);
        
        if (cargoMatch) {
          const startPos = cargoMatch.index + cargoMatch[0].length;
          const restOfText = textoVisado.substring(startPos, startPos + 200);
          
          // Buscar estructura Nombre: ... Fecha: ...
          const estructuraMatch = restOfText.match(/Nombre:\s*([^\n]+)[\s\S]*?Fecha:\s*([^\n]+)/i);
          
          if (estructuraMatch) {
            const nombre = estructuraMatch[1]?.trim() || '';
            const fecha = estructuraMatch[2]?.trim() || '';
            const contenido = `Nombre: ${nombre} | Fecha: ${fecha}`;
            
            if (!titulosSet.has(campo)) {
              titulosSet.add(campo);
              titulos.push(campo);
              contenidoCompleto[campo] = contenido;
              console.log(`✅ ${campo}: ${contenido}`);
            }
          } else {
            // Extraer las siguientes 2-3 líneas como contenido
            const lineas = restOfText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !l.match(/^[_\-\s]+$/));
            const contenido = lineas.slice(0, 2).join(' | ');
            
            if (contenido && !titulosSet.has(campo)) {
              titulosSet.add(campo);
              titulos.push(campo);
              contenidoCompleto[campo] = contenido;
              console.log(`✅ ${campo}: ${contenido}`);
            }
          }
        }
      }
      
      // También buscar campos adicionales de firma
      const otrosCargos = ['Firma', 'Sello', 'Fecha de elaboración', 'Fecha de aprobación'];
      for (const cargo of otrosCargos) {
        const regex = new RegExp(cargo + '[:\\s]*([^\\n]{5,100})', 'i');
        const match = textoVisado.match(regex);
        if (match && !titulosSet.has(cargo)) {
          titulosSet.add(cargo);
          titulos.push(cargo);
          contenidoCompleto[cargo] = match[1]?.trim() || '';
          console.log(`✅ ${cargo}: ${match[1]?.trim() || ''}`);
        }
      }
    } else {
      console.log('⚠️ No se encontró la sección VISADO en el documento');
    }

    // VERIFICACIÓN FINAL: Comprobar qué campos obligatorios se encontraron
    console.log('\n=== VERIFICACIÓN DE CAMPOS OBLIGATORIOS ===');
    const camposFaltantes = [];
    for (const campo of camposObligatorios) {
      const encontrado = titulos.some(t => 
        t.toLowerCase().includes(campo.toLowerCase()) ||
        campo.toLowerCase().includes(t.toLowerCase())
      );
      if (encontrado) {
        console.log(`✅ ${campo}`);
      } else {
        console.log(`❌ ${campo} - NO ENCONTRADO`);
        camposFaltantes.push(campo);
      }
    }
    
    if (camposFaltantes.length > 0) {
      console.log('\n⚠️ ADVERTENCIA: Faltan los siguientes campos:');
      console.log(camposFaltantes.join(', '));
    } else {
      console.log('\n✅ TODOS los campos obligatorios fueron encontrados');
    }
    
    // Organizar campos por sección
    const camposPorSeccion = {
      'DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA': [],
      'ESTRUCTURA DE LA ASIGNATURA': [],
      'RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES': [],
      'VISADO': []
    };
    
    // Asignar cada título a su sección correspondiente
    let seccionActualKey = null;
    
    for (const titulo of titulos) {
      const tituloUpper = titulo.toUpperCase();
      const tituloLimpio = titulo.trim();
      
      // Detectar si es un título de sección (NO agregarlo como campo)
      const esTituloSeccion = seccionesPrincipales.some(seccion => 
        seccion.toUpperCase().includes(tituloUpper) || tituloUpper.includes(seccion.toUpperCase())
      );
      
      // Cambiar la sección actual cuando encontramos un título de sección
      if (tituloUpper.includes('DATOS GENERALES')) {
        seccionActualKey = 'DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA';
        // NO agregarlo como campo si es el título de sección
        if (!esTituloSeccion || tituloLimpio.length < 30) {
          continue;
        }
      } else if (tituloUpper.includes('ESTRUCTURA DE LA ASIGNATURA') || tituloUpper === 'ESTRUCTURA') {
        seccionActualKey = 'ESTRUCTURA DE LA ASIGNATURA';
        continue; // No agregar el título de sección como campo
      } else if ((tituloUpper.includes('RESULTADOS') && tituloUpper.includes('EVALUACIÓN')) || 
                 (tituloUpper.includes('RESULTADOS') && tituloUpper.includes('APRENDIZAJE'))) {
        seccionActualKey = 'RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES';
        continue; // No agregar el título de sección como campo
      } else if (tituloUpper === 'VISADO' || (tituloUpper.includes('VISADO') && tituloLimpio.length < 15)) {
        seccionActualKey = 'VISADO';
        continue; // No agregar el título de sección como campo
      } else if (seccionActualKey && !esTituloSeccion) {
        // Agregar a la sección actual SOLO si NO es un título de sección
        camposPorSeccion[seccionActualKey].push(titulo);
      }
    }
    
    console.log('\n=== CAMPOS ORGANIZADOS POR SECCIÓN ===');
    for (const [seccion, campos] of Object.entries(camposPorSeccion)) {
      console.log(`\n📁 ${seccion} (${campos.length} campos):`);
      campos.slice(0, 5).forEach((campo, idx) => {
        console.log(`   ${idx + 1}. ${campo}`);
      });
      if (campos.length > 5) {
        console.log(`   ... y ${campos.length - 5} campos más`);
      }
    }
    
    // Estructura de datos para guardar
    const datos_syllabus = {
      titulos: titulos,
      contenido: contenidoCompleto,
      secciones: seccionesPrincipales,
      campos_por_seccion: camposPorSeccion, // Organización por secciones
      texto_completo: text,
      html_completo: html,
      fecha_extraccion: new Date().toISOString(),
      campos_faltantes: camposFaltantes
    };

    // Crear el registro en la base de datos
    const nuevoSyllabus = await Syllabus.create({
      nombre,
      periodo,
      materias,
      datos_syllabus,
      usuario_id
    });

    // Eliminar el archivo temporal
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(201).json({
      success: true,
      message: camposFaltantes.length > 0 
        ? `Documento procesado. ADVERTENCIA: ${camposFaltantes.length} campos no encontrados` 
        : 'Documento procesado exitosamente con todos los campos',
      data: {
        id: nuevoSyllabus.id,
        nombre: nuevoSyllabus.nombre,
        periodo: nuevoSyllabus.periodo,
        materias: nuevoSyllabus.materias,
        titulos_extraidos: titulos.length,
        campos_obligatorios_encontrados: camposObligatorios.length - camposFaltantes.length,
        campos_obligatorios_totales: camposObligatorios.length,
        campos_faltantes: camposFaltantes,
        titulos: titulos, // TODOS los títulos extraídos
        secciones: seccionesPrincipales, // Secciones principales detectadas
        campos_por_seccion: datos_syllabus.campos_por_seccion, // Campos organizados por sección
        primeros_20_titulos: titulos.slice(0, 20) // Mantener por compatibilidad
      }
    });

  } catch (error) {
    console.error('Error al procesar documento:', error);
    
    // Limpiar el archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: 'Error al procesar el documento',
      error: error.message
    });
  }
};

// --- SUBIR Y PROCESAR ARCHIVO EXCEL ---
exports.uploadExcel = async (req, res) => {
  try {
    console.log('\n=== INICIANDO PROCESAMIENTO DE ARCHIVO EXCEL ===\n');
    
    const { nombre, periodo, materias } = req.body;
    const usuario_id = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo Excel'
      });
    }

    if (!nombre || !periodo || !materias) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, periodo y materias son obligatorios'
      });
    }

    const filePath = req.file.path;
    console.log('📁 Archivo Excel recibido:', req.file.originalname);

    // Leer el archivo Excel
    const workbook = xlsx.readFile(filePath);
    console.log('📊 Hojas encontradas:', workbook.SheetNames.length);
    console.log('📋 Nombres de hojas:', workbook.SheetNames.join(', '));

    const camposPorSeccion = {};
    const todasLasCeldasExtraidas = [];
    let totalCamposExtraidos = 0;

    // Procesar cada hoja del Excel
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n=== Procesando hoja: "${sheetName}" ===`);
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir la hoja a JSON (array de objetos)
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { 
        header: 1, // Usar índices numéricos como encabezados
        defval: '', // Valor por defecto para celdas vacías
        blankrows: false // Omitir filas completamente vacías
      });

      const camposDeHoja = [];

      // Extraer todos los valores no vacíos
      jsonData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell && cell.toString().trim() !== '') {
            const valorCelda = cell.toString().trim();
            
            // Detectar si es un campo (título) o contenido
            // Consideramos campo si tiene cierto formato o es la primera columna
            const esCampo = colIndex === 0 || 
                           valorCelda.length < 100 || 
                           valorCelda.endsWith(':') ||
                           /^[A-ZÁÉÍÓÚÑ\s]+:?$/.test(valorCelda);
            
            if (esCampo) {
              const campoLimpio = valorCelda.replace(/:$/, '').trim();
              if (campoLimpio.length > 2) {
                camposDeHoja.push(campoLimpio);
                todasLasCeldasExtraidas.push({
                  hoja: sheetName,
                  fila: rowIndex + 1,
                  columna: colIndex + 1,
                  valor: campoLimpio
                });
              }
            }
          }
        });
      });

      console.log(`✓ Campos extraídos de "${sheetName}": ${camposDeHoja.length}`);
      
      // Agregar los campos de esta hoja a la estructura
      camposPorSeccion[sheetName] = camposDeHoja;
      totalCamposExtraidos += camposDeHoja.length;
    }

    console.log(`\n✓ Total de campos extraídos: ${totalCamposExtraidos}`);
    console.log(`✓ Hojas procesadas: ${Object.keys(camposPorSeccion).length}`);

    // Estructura de datos para guardar
    const datos_syllabus = {
      tipo_archivo: 'excel',
      hojas: workbook.SheetNames,
      campos_por_seccion: camposPorSeccion,
      total_campos: totalCamposExtraidos,
      fecha_extraccion: new Date().toISOString()
    };

    // Crear el registro en la base de datos
    const nuevoSyllabus = await Syllabus.create({
      nombre,
      periodo,
      materias,
      datos_syllabus,
      usuario_id
    });

    // Eliminar el archivo temporal
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Preparar lista de todos los títulos para compatibilidad
    const todosTitulos = [];
    for (const hoja of workbook.SheetNames) {
      todosTitulos.push(...(camposPorSeccion[hoja] || []));
    }

    return res.status(201).json({
      success: true,
      message: 'Archivo Excel procesado exitosamente',
      data: {
        id: nuevoSyllabus.id,
        nombre: nuevoSyllabus.nombre,
        periodo: nuevoSyllabus.periodo,
        materias: nuevoSyllabus.materias,
        tipo_archivo: 'excel',
        hojas: workbook.SheetNames,
        titulos_extraidos: totalCamposExtraidos,
        titulos: todosTitulos,
        campos_por_seccion: camposPorSeccion
      }
    });

  } catch (error) {
    console.error('Error al procesar archivo Excel:', error);
    
    // Limpiar el archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo Excel',
      error: error.message
    });
  }
};