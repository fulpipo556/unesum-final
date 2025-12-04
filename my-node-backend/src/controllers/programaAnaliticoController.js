const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const db = require('../models');

// Modelos
const ProgramaAnalitico = db.ProgramasAnaliticos;
const Usuario = db.Usuario;

/**
 * Controlador para gestión de programas analíticos
 */

// Subir y procesar archivo Excel de programa analítico
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.excel || req.files.excel.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo Excel'
      });
    }

    const excelFile = req.files.excel[0];
    const escudoFile = req.files.escudo ? req.files.escudo[0] : null;

    // Validar formato Excel
    const validExcelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validExcelTypes.includes(excelFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de archivo inválido. Use .xls o .xlsx'
      });
    }

    // Leer y procesar Excel desde buffer de multer
    const workbook = xlsx.read(excelFile.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Extraer todas las celdas con header para detectar secciones
    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo Excel está vacío'
      });
    }

    // Función para detectar secciones por títulos
    const detectarSecciones = (data) => {
      const secciones = [];
      const seccionesEspeciales = [
        { patron: 'CARACTERIZACIÓN', tipo: 'texto_largo' },
        { patron: 'OBJETIVOS DE LA ASIGNATURA', tipo: 'texto_largo' },
        { patron: 'COMPETENCIAS', tipo: 'texto_largo' },
        { patron: 'RESULTADOS DE APRENDIZAJE', tipo: 'texto_largo' },
        { patron: 'CONTENIDO DE LA ASIGNATURA', tipo: 'tabla' },
        { patron: 'METODOLOGÍA', tipo: 'texto_largo' },
        { patron: 'PROCEDIMIENTO DE EVALUACIÓN', tipo: 'texto_largo' },
        { patron: 'BIBLIOGRAFÍA - FUENTES', tipo: 'tabla' },
        { patron: 'BIBLIOGRAFÍA BÁSICA', tipo: 'texto_largo' },
        { patron: 'BIBLIOGRAFÍA COMPLEMENTARIA', tipo: 'texto_largo' }
      ];

      let seccionActual = null;
      let tipoSeccion = 'texto_largo';
      let datosSeccion = [];
      let encabezadosTabla = [];

      data.forEach((fila, idx) => {
        const primeraColumna = fila[0] ? fila[0].toString().trim() : '';
        const filaTexto = fila.join(' ').trim();
        
        // Detectar si es un título de sección
        const seccionEncontrada = seccionesEspeciales.find(sec => 
          primeraColumna.includes(sec.patron) || filaTexto.includes(sec.patron)
        );

        if (seccionEncontrada) {
          // Guardar sección anterior si existe
          if (seccionActual && datosSeccion.length > 0) {
            secciones.push({
              titulo: seccionActual,
              tipo: tipoSeccion,
              encabezados: encabezadosTabla,
              datos: datosSeccion
            });
          }
          // Iniciar nueva sección
          seccionActual = primeraColumna || filaTexto;
          tipoSeccion = seccionEncontrada.tipo;
          datosSeccion = [];
          encabezadosTabla = [];
          
          // Si es tabla, la siguiente fila puede ser encabezados
          if (tipoSeccion === 'tabla' && idx + 1 < data.length) {
            const siguienteFila = data[idx + 1];
            if (siguienteFila.some(cell => cell && cell.toString().trim() !== '')) {
              encabezadosTabla = siguienteFila.map(h => h ? h.toString().trim() : '');
            }
          }
        } else if (seccionActual) {
          // Solo agregar filas con contenido
          if (fila.some(cell => cell && cell.toString().trim() !== '')) {
            // Saltar fila de encabezados si ya fue procesada
            if (tipoSeccion === 'tabla' && encabezadosTabla.length > 0 && 
                JSON.stringify(fila) === JSON.stringify(encabezadosTabla.map(h => h))) {
              return;
            }
            datosSeccion.push(fila);
          }
        }
      });

      // Guardar última sección
      if (seccionActual && datosSeccion.length > 0) {
        secciones.push({
          titulo: seccionActual,
          tipo: tipoSeccion,
          encabezados: encabezadosTabla,
          datos: datosSeccion
        });
      }

      return secciones;
    };

    const seccionesDetectadas = detectarSecciones(jsonData);

    // Guardar archivos
    const uploadsDir = path.join(__dirname, '../../uploads/programa-analitico');
    await fs.mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const excelFileName = `programa_${timestamp}_${excelFile.originalname}`;
    const excelPath = path.join(uploadsDir, excelFileName);
    await fs.writeFile(excelPath, excelFile.buffer);

    let escudoPath = null;
    let escudoFileName = null;
    if (escudoFile) {
      escudoFileName = `escudo_${timestamp}_${escudoFile.originalname}`;
      escudoPath = path.join(uploadsDir, escudoFileName);
      await fs.writeFile(escudoPath, escudoFile.buffer);
    }

    // Extraer datos principales del encabezado
    let datosGenerales = {};
    
    // Buscar datos generales en las primeras filas
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const fila = jsonData[i];
      if (fila[0] && fila[0].toString().includes('ASIGNATURA')) {
        datosGenerales.asignatura = fila[1] || '';
      }
      if (fila[0] && fila[0].toString().includes('PERIODO')) {
        datosGenerales.periodo_academico = fila[1] || '';
      }
      if (fila[0] && fila[0].toString().includes('NIVEL')) {
        datosGenerales.nivel = fila[1] || '';
      }
    }

    // Procesar secciones para crear estructura de tablas
    const tablasDatos = seccionesDetectadas.map(seccion => {
      let datosObjeto = [];

      if (seccion.tipo === 'texto_largo') {
        // Para secciones de texto largo, combinar todo en un solo campo
        datosObjeto = [{
          contenido: seccion.datos.map(fila => 
            fila.filter(cell => cell && cell.toString().trim() !== '').join(' ')
          ).join('\n')
        }];
      } else if (seccion.tipo === 'tabla') {
        // Para tablas, usar encabezados si existen
        datosObjeto = seccion.datos.map((fila, idx) => {
          if (!fila.some(cell => cell && cell.toString().trim() !== '')) return null;
          
          const objeto = {};
          
          if (seccion.encabezados && seccion.encabezados.length > 0) {
            // Usar encabezados como claves
            seccion.encabezados.forEach((encabezado, colIdx) => {
              const clave = encabezado 
                ? encabezado.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')
                : `columna_${colIdx + 1}`;
              objeto[clave] = fila[colIdx] ? fila[colIdx].toString().trim() : '';
            });
          } else {
            // Sin encabezados, usar columna_N
            fila.forEach((celda, colIdx) => {
              objeto[`columna_${colIdx + 1}`] = celda ? celda.toString().trim() : '';
            });
          }
          
          return objeto;
        }).filter(item => item !== null && Object.values(item).some(v => v !== ''));
      }

      return {
        titulo: seccion.titulo,
        tipo: seccion.tipo,
        encabezados: seccion.encabezados || [],
        datos: datosObjeto
      };
    });
    
    // Preparar datos para guardar en la tabla existente
    const programaData = {
      nombre: datosGenerales.asignatura || 'Programa Analítico',
      datos_tabla: {
        archivo_excel: excelFileName,
        archivo_escudo: escudoFileName,
        rutas: {
          excel: excelPath,
          escudo: escudoPath
        },
        datos_generales: {
          carrera: datosGenerales.carrera || '',
          nivel: datosGenerales.nivel || '',
          paralelo: datosGenerales.paralelo || '',
          asignatura: datosGenerales.asignatura || '',
          codigo: datosGenerales.codigo || '',
          creditos: datosGenerales.creditos || 0,
          horas_semanales: datosGenerales.horas_semanales || 0,
          periodo_academico: datosGenerales.periodo_academico || '',
          docente: datosGenerales.docente || ''
        },
        unidades_tematicas: [],
        tablas_datos: tablasDatos,
        secciones_completas: seccionesDetectadas,
        fecha_carga: new Date().toISOString()
      },
      usuario_id: req.user?.id || null
    };

    const programaAnalitico = await ProgramaAnalitico.create(programaData);

    return res.status(201).json({
      success: true,
      message: 'Programa analítico cargado exitosamente',
      data: {
        id: programaAnalitico.id,
        archivo_excel: excelFileName,
        archivo_escudo: escudoFileName,
        registros_procesados: jsonData.length,
        secciones_detectadas: seccionesDetectadas.length,
        secciones: seccionesDetectadas.map(s => s.titulo)
      }
    });

  } catch (error) {
    console.error('Error al cargar programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo',
      error: error.message
    });
  }
};

// Descargar plantilla de Excel
exports.descargarPlantilla = async (req, res) => {
  try {
    // Crear plantilla con datos de ejemplo
    const plantillaData = [
      {
        carrera: 'Ingeniería en Sistemas',
        nivel: 'Primer Nivel',
        paralelo: 'A',
        asignatura: 'Programación I',
        codigo: 'PROG101',
        creditos: 4,
        horas_semanales: 5,
        periodo_academico: '2025-1',
        docente: 'Dr. Juan Pérez',
        unidad_tematica: 'Unidad 1: Introducción',
        contenidos: 'Variables, tipos de datos, operadores',
        horas_clase: 8,
        horas_practicas: 12,
        horas_autonomas: 20,
        estrategias_metodologicas: 'Clases magistrales, laboratorios prácticos',
        recursos_didacticos: 'Computadora, proyector, IDE',
        evaluacion: 'Examen parcial 30%, Laboratorios 40%, Proyecto 30%',
        bibliografia: 'Deitel, P. (2020). Java How to Program'
      },
      {
        carrera: 'Ingeniería en Sistemas',
        nivel: 'Primer Nivel',
        paralelo: 'A',
        asignatura: 'Programación I',
        codigo: 'PROG101',
        creditos: 4,
        horas_semanales: 5,
        periodo_academico: '2025-1',
        docente: 'Dr. Juan Pérez',
        unidad_tematica: 'Unidad 2: Estructuras de Control',
        contenidos: 'If-else, switch, bucles for, while',
        horas_clase: 10,
        horas_practicas: 15,
        horas_autonomas: 25,
        estrategias_metodologicas: 'Ejercicios prácticos, resolución de problemas',
        recursos_didacticos: 'Material didáctico, ejercicios en línea',
        evaluacion: 'Examen parcial 30%, Prácticas 70%',
        bibliografia: 'Joyanes, L. (2019). Fundamentos de Programación'
      }
    ];

    // Crear workbook
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(plantillaData);

    // Configurar anchos de columnas
    ws['!cols'] = [
      { wch: 25 }, // carrera
      { wch: 15 }, // nivel
      { wch: 10 }, // paralelo
      { wch: 25 }, // asignatura
      { wch: 10 }, // codigo
      { wch: 10 }, // creditos
      { wch: 15 }, // horas_semanales
      { wch: 15 }, // periodo_academico
      { wch: 25 }, // docente
      { wch: 30 }, // unidad_tematica
      { wch: 40 }, // contenidos
      { wch: 12 }, // horas_clase
      { wch: 15 }, // horas_practicas
      { wch: 15 }, // horas_autonomas
      { wch: 40 }, // estrategias_metodologicas
      { wch: 30 }, // recursos_didacticos
      { wch: 40 }, // evaluacion
      { wch: 40 }  // bibliografia
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Programa Analítico');

    // Generar buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Enviar archivo
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_programa_analitico.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error al generar plantilla:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar plantilla',
      error: error.message
    });
  }
};

// Listar todos los programas analíticos
exports.getAll = async (req, res) => {
  try {
    const programas = await ProgramaAnalitico.findAll({
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: programas
    });

  } catch (error) {
    console.error('Error al obtener programas analíticos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programas analíticos',
      error: error.message
    });
  }
};

// Obtener un programa analítico por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const programa = await ProgramaAnalitico.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analítico no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      data: programa
    });

  } catch (error) {
    console.error('Error al obtener programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programa analítico',
      error: error.message
    });
  }
};

// Obtener estructura del formulario desde el primer programa analítico guardado
exports.getEstructuraFormulario = async (req, res) => {
  try {
    // Buscar el primer programa analítico con datos_tabla
    const programa = await ProgramaAnalitico.findOne({
      where: {},
      order: [['createdAt', 'DESC']]
    });

    if (!programa || !programa.datos_tabla) {
      return res.status(200).json({
        success: true,
        data: {
          campos_datos_generales: [
            'carrera', 'nivel', 'paralelo', 'asignatura', 'codigo', 
            'creditos', 'horas_semanales', 'periodo_academico', 'docente'
          ],
          campos_unidades: [
            'unidad_tematica', 'contenidos', 'horas_clase', 'horas_practicas',
            'horas_autonomas', 'estrategias_metodologicas', 'recursos_didacticos',
            'evaluacion', 'bibliografia'
          ],
          mensaje: 'Usando estructura por defecto'
        }
      });
    }

    // Extraer campos desde los datos guardados
    const datosGenerales = programa.datos_tabla.datos_generales || {};
    const unidadesTematicas = programa.datos_tabla.unidades_tematicas || [];
    const tablasDatos = programa.datos_tabla.tablas_datos || [];

    const camposDatosGenerales = Object.keys(datosGenerales).filter(k => k !== 'fecha_carga');
    
    let camposUnidades = [];
    if (unidadesTematicas.length > 0) {
      const primeraUnidad = unidadesTematicas[0];
      camposUnidades = Object.keys(primeraUnidad).filter(k => 
        !['carrera', 'nivel', 'paralelo', 'asignatura', 'codigo', 
          'creditos', 'horas_semanales', 'periodo_academico', 'docente'].includes(k)
      );
    }

    // Extraer estructura de tablas adicionales con tipos
    const seccionesTablas = tablasDatos.map(tabla => ({
      titulo: tabla.titulo || '',
      tipo: tabla.tipo || 'texto_largo',
      encabezados: tabla.encabezados || [],
      campos: Object.keys(tabla.datos?.[0] || {}),
      ejemplo: tabla.datos?.[0] || {}
    }));

    return res.status(200).json({
      success: true,
      data: {
        campos_datos_generales: camposDatosGenerales.length > 0 ? camposDatosGenerales : [
          'carrera', 'nivel', 'paralelo', 'asignatura', 'codigo', 
          'creditos', 'horas_semanales', 'periodo_academico', 'docente'
        ],
        campos_unidades: camposUnidades.length > 0 ? camposUnidades : [
          'unidad_tematica', 'contenidos', 'horas_clase', 'horas_practicas',
          'horas_autonomas', 'estrategias_metodologicas', 'recursos_didacticos',
          'evaluacion', 'bibliografia'
        ],
        secciones_tablas: seccionesTablas,
        ejemplo_datos_generales: datosGenerales,
        ejemplo_unidad: unidadesTematicas[0] || null,
        tablas_completas: tablasDatos
      }
    });

  } catch (error) {
    console.error('Error al obtener estructura:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estructura del formulario',
      error: error.message
    });
  }
};

// Eliminar programa analítico
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const programa = await ProgramaAnalitico.findByPk(id);

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analítico no encontrado'
      });
    }

    // Eliminar archivos físicos si existen en datos_tabla
    if (programa.datos_tabla && programa.datos_tabla.rutas) {
      const { excel, escudo } = programa.datos_tabla.rutas;
      
      if (excel) {
        try {
          await fs.unlink(excel);
        } catch (err) {
          console.error('Error al eliminar archivo Excel:', err);
        }
      }

      if (escudo) {
        try {
          await fs.unlink(escudo);
        } catch (err) {
          console.error('Error al eliminar archivo de escudo:', err);
        }
      }
    }

    await programa.destroy();

    return res.status(200).json({
      success: true,
      message: 'Programa analítico eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar programa analítico',
      error: error.message
    });
  }
};

module.exports = exports;
