// Ruta: controllers/profesor.controller.js

const db = require('../models');
const Profesor = db.Profesor;
const Carrera = db.Carrera;
const Facultad = db.Facultad;
const { Op } = require('sequelize'); // Importar Op para consultas complejas
const fs = require('fs');
const xlsx = require('xlsx');
// --- NUEVO: Importar dependencias para contraseñas y correos ---
const crypto = require('crypto'); // Módulo nativo de Node.js
const bcrypt = require('bcryptjs'); // Para hashear contraseñas
// --- CAMBIO #1: Importar Nodemailer directamente aquí ---
const nodemailer = require('nodemailer');
// Cargar variables de entorno (idealmente esto se hace una vez en server.js o app.js)
require('dotenv').config(); 

// --- CAMBIO #2: La función de envío de correo ahora vive DENTRO de este archivo ---
const sendEmailInternally = async (options) => {
  // 1. Crear el "transporter" con las variables de entorno
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true para puerto 465
    auth: {
      user: process.env.EMAIL_USER, // Tu usuario de Mailtrap o Gmail
      pass: process.env.EMAIL_PASS, // Tu contraseña de Mailtrap o de aplicación de Gmail
    },
    // Descomenta estas líneas si tienes problemas de conexión para obtener más detalles
    // logger: true, 
    // debug: true,
  });

  // 2. Definir las opciones del email
  const mailOptions = {
    from: '"Plataforma Académica" <no-reply@tuapp.com>',
    // --- IMPORTANTE: Usamos el email que viene en 'options' ---
    // Esto asegura que el correo se envía al profesor que se está creando.
    to: options.email, 
    subject: options.subject,
    html: options.message,
  };

  try {
    // 3. Enviar el email y mostrar un log de éxito
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado exitosamente a ${options.email}. Message ID: ${info.messageId}`);
  } catch (error) {
    // Si falla, mostrar el error detallado en la consola del servidor
    console.error(`❌ ERROR al enviar correo a ${options.email}:`, error);
    // Lanzamos el error para que la función que lo llamó pueda manejarlo si es necesario
    throw new Error('El servicio de correo falló al enviar el email.');
  }
};


exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, passwordConfirm } = req.body;

        if (!password || password !== passwordConfirm) {
            return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden o están vacías.' });
        }

        // Hashear el token recibido para buscarlo en la BD
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Buscar al profesor con el token válido y que no haya expirado
        const profesor = await Profesor.findOne({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { [Op.gt]: Date.now() } // El token no ha expirado
            }
        });

        if (!profesor) {
            return res.status(400).json({ success: false, message: 'El token es inválido o ha expirado.' });
        }

        // Si el token es válido, actualizar la contraseña y limpiar los campos de reseteo
        profesor.password = await bcrypt.hash(password, 12);
        profesor.passwordResetToken = null;
        profesor.passwordResetExpires = null;
        await profesor.save();

        res.status(200).json({ success: true, message: 'Contraseña actualizada exitosamente.' });

    } catch (error) {
        console.error('Error al resetear la contraseña:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la solicitud.', error: error.message });
    }
};

// --- OBTENER SYLLABI ASIGNADOS AL PROFESOR ---
exports.getMySyllabi = async (req, res) => {
  try {
    const profesorId = req.user.id; // ID del profesor autenticado
    
    const profesor = await Profesor.findByPk(profesorId, {
      include: [
        {
          model: db.Asignatura,
          as: 'asignatura',
          attributes: ['id', 'nombre', 'codigo'],
          include: [{
            model: db.Carrera,
            as: 'carrera',
            attributes: ['id', 'nombre'],
            include: [{
              model: db.Facultad,
              as: 'facultad',
              attributes: ['id', 'nombre']
            }]
          }]
        },
        {
          model: db.Nivel,
          as: 'nivel',
          attributes: ['id', 'nombre']
        },
        {
          model: db.Paralelo,
          as: 'paralelo',
          attributes: ['id', 'nombre']
        }
      ]
    });

    if (!profesor) {
      return res.status(404).json({ success: false, message: 'Profesor no encontrado' });
    }

    // Obtener syllabi creados para la asignatura del profesor
    const Syllabus = db.Syllabus;
    const syllabi = await Syllabus.findAll({
      where: {
        [Op.or]: [
          { profesor_id: profesorId }, // Syllabi asignados directamente al profesor
          { profesor_id: null } // Syllabi sin asignar (plantillas generales)
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ 
      success: true, 
      data: {
        profesor: {
          id: profesor.id,
          nombres: profesor.nombres,
          apellidos: profesor.apellidos,
          email: profesor.email,
          asignatura: profesor.asignatura,
          nivel: profesor.nivel,
          paralelo: profesor.paralelo
        },
        syllabi: syllabi
      }
    });

  } catch (error) {
    console.error('Error al obtener syllabi del profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener syllabi', error: error.message });
  }
};
const createPasswordResetToken = () => {
  // 1. Generar un token simple y aleatorio
  const resetToken = crypto.randomBytes(32).toString('hex');

  // 2. Hashear el token antes de guardarlo en la BD (más seguro)
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3. Establecer la fecha de expiración (12 horas desde ahora)
  const expirationDate = Date.now() + 12 * 60 * 60 * 1000;

  // Se retorna el token original (para el email) y el hasheado (para la BD)
  return { resetToken, hashedToken, expirationDate };
};

// --- NUEVO: Función auxiliar para enviar el correo de bienvenida ---
const sendPasswordSetupEmail = async (profesor, resetToken) => {
  // Reemplaza 'http://localhost:3000' con la URL de tu frontend
  const setupURL = `http://localhost:3000/configurar-password/${resetToken}`;

  const message = `
    <h1>Bienvenido a la plataforma</h1>
    <p>Hola ${profesor.nombres},</p>
    <p>Has sido registrado en el sistema. Para completar tu registro y establecer una contraseña segura, por favor haz clic en el siguiente enlace.</p>
    <p>Este enlace es válido por las próximas 12 horas.</p>
    <a href="${setupURL}" target="_blank" style="padding: 10px 15px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
      Configurar mi Contraseña
    </a>
    <p>Si no esperabas este correo, puedes ignorarlo de forma segura.</p>
  `;

  try {
    await sendEmailInternally({
      email: profesor.email,
      subject: 'Configura tu cuenta de profesor',
      message,
    });
  } catch (error) {
    console.error(`FALLO AL ENVIAR EMAIL a ${profesor.email}:`, error);
    // Podrías añadir lógica aquí para reintentar o marcar al usuario
  }
};
// --- OBTENER TODOS LOS PROFESORES ---
exports.getAll = async (req, res) => {
  try {
    const profesores = await Profesor.findAll({
      order: [['apellidos', 'ASC'], ['nombres', 'ASC']],
      // Incluir información anidada para mostrar en la tabla del frontend
      include: [
        {
          model: Carrera,
          as: 'carrera',
          attributes: ['id', 'nombre'],
          include: {
            model: Facultad,
            as: 'facultad',
            attributes: ['id', 'nombre']
          }
        },
        {
          model: db.Asignatura,
          as: 'asignatura',
          attributes: ['id', 'nombre', 'codigo']
        },
        {
          model: db.Nivel,
          as: 'nivel',
          attributes: ['id', 'nombre', 'codigo']
        },
        {
          model: db.Paralelo,
          as: 'paralelo',
          attributes: ['id', 'nombre', 'codigo']
        }
      ]
    });
    console.log(`✅ GET /api/profesores - Retornando ${profesores.length} profesores`);
    return res.status(200).json({ success: true, data: profesores });
  } catch (error) {
    console.error('❌ Error al obtener profesores:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener los profesores', error: error.message });
  }
};

// --- IMPORTACIÓN MASIVA DESDE CSV CON TUPLAS ---
exports.uploadCSV = async (req, res) => {
  try {
    console.log('📤 Inicio de importación CSV');
    console.log('📁 Archivo recibido:', req.file);
    console.log('📁 Body:', req.body);
    
    if (!req.file) {
      console.log('❌ No se recibió archivo');
      return res.status(400).json({ 
        success: false, 
        message: 'No se ha enviado ningún archivo. Asegúrese de seleccionar un archivo CSV.' 
      });
    }

    const filePath = req.file.path;
    console.log('📂 Ruta del archivo:', filePath);
    console.log('📂 Nombre original:', req.file.originalname);
    console.log('📂 MIME type:', req.file.mimetype);
    
    let workbook, data;
    try {
      workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      console.log('📋 Nombre de la hoja:', sheetName);
      const sheet = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(sheet);
      console.log('📊 Datos parseados:', data.length, 'filas');
      console.log('🔍 Primera fila:', JSON.stringify(data[0], null, 2));
      console.log('🔍 Columnas detectadas:', data[0] ? Object.keys(data[0]) : 'ninguna');
    } catch (parseError) {
      console.error('❌ Error al parsear CSV:', parseError);
      fs.unlinkSync(filePath);
      return res.status(422).json({ 
        success: false, 
        message: 'Error al leer el archivo CSV. Verifique que sea un archivo CSV válido con las columnas: Docente,Carrera,Asinatura,Nivel,Paralelo,Rol',
        error: parseError.message,
        detalles: 'El archivo debe tener las siguientes columnas en la primera fila: Docente, Carrera, Asinatura, Nivel, Paralelo, Rol'
      });
    }

    if (data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        message: 'El archivo CSV está vacío o no tiene datos válidos después de la cabecera.' 
      });
    }

    const resultados = {
      exitosos: [],
      fallidos: [],
      total: data.length,
      registrosCreados: 0
    };

    // Obtener todas las asignaturas, niveles, paralelos y carreras para búsqueda rápida
    console.log('🔍 Cargando datos de referencia...');
    const todasAsignaturas = await db.Asignatura.findAll();
    const todosNiveles = await db.Nivel.findAll();
    const todosParalelos = await db.Paralelo.findAll();
    const todasCarreras = await Carrera.findAll();
    console.log(`✅ Datos cargados: ${todasAsignaturas.length} asignaturas, ${todosNiveles.length} niveles, ${todosParalelos.length} paralelos, ${todasCarreras.length} carreras`);

    for (const fila of data) {
      try {
        console.log('🔄 Procesando fila:', fila);
        const { Docente, Carrera: carreraNombre, Asinatura, Nivel, Paralelo, Rol } = fila;

        if (!Docente || !carreraNombre) {
          console.log('❌ Falta Docente o Carrera');
          resultados.fallidos.push({ 
            fila, 
            error: 'Docente y Carrera son campos obligatorios' 
          });
          continue;
        }

        // Extraer nombres y apellidos
        const nombreCompleto = Docente.trim().split(' ');
        const nombres = nombreCompleto.slice(0, -1).join(' ') || nombreCompleto[0];
        const apellidos = nombreCompleto.slice(-1).join(' ') || '';
        console.log(`👤 Procesando: ${nombres} ${apellidos}`);

        // Función para normalizar texto (quitar acentos)
        const normalizar = (texto) => {
          return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        };

        // Buscar carrera (búsqueda flexible sin acentos)
        const carrera = todasCarreras.find(c => {
          const nombreCarreraNorm = normalizar(c.nombre);
          const busquedaNorm = normalizar(carreraNombre.trim());
          return nombreCarreraNorm.includes(busquedaNorm) || busquedaNorm.includes(nombreCarreraNorm);
        });

        if (!carrera) {
          console.log(`❌ Carrera no encontrada: "${carreraNombre}"`);
          console.log(`   Carreras disponibles: ${todasCarreras.map(c => c.nombre).join(', ')}`);
          resultados.fallidos.push({ 
            fila, 
            error: `Carrera "${carreraNombre}" no encontrada. Disponibles: ${todasCarreras.map(c => c.nombre).slice(0, 3).join(', ')}` 
          });
          continue;
        }
        console.log(`✅ Carrera encontrada: "${carrera.nombre}"`);

        // Generar email automático si no viene
        const baseEmail = fila.email || `${nombres.toLowerCase().replace(/\s/g, '.')}.${apellidos.toLowerCase().replace(/\s/g, '.')}@unesum.edu.ec`;

        // Parsear asignaturas múltiples (soporta con o sin paréntesis externos)
        let asignaturas = [];
        if (Asinatura) {
          // Limpiar paréntesis externos si existen: "(Prog I, Prog III)" -> "Prog I, Prog III"
          let asignaturasTexto = Asinatura.trim();
          if (asignaturasTexto.startsWith('(') && asignaturasTexto.endsWith(')')) {
            asignaturasTexto = asignaturasTexto.slice(1, -1);
          }
          const asignaturasNombres = asignaturasTexto.split(',').map(a => a.trim());
          asignaturas = asignaturasNombres.map(nombre => {
            const busquedaNorm = normalizar(nombre);
            
            // Primero: buscar coincidencia exacta
            let encontrada = todasAsignaturas.find(asig => {
              const nombreAsigNorm = normalizar(asig.nombre);
              return nombreAsigNorm === busquedaNorm;
            });
            
            // Si no: buscar que el nombre de la BD contenga la búsqueda
            if (!encontrada) {
              encontrada = todasAsignaturas.find(asig => {
                const nombreAsigNorm = normalizar(asig.nombre);
                return nombreAsigNorm.includes(busquedaNorm);
              });
            }
            
            // Si no: buscar que la búsqueda contenga el nombre de la BD  
            if (!encontrada) {
              encontrada = todasAsignaturas.find(asig => {
                const nombreAsigNorm = normalizar(asig.nombre);
                return busquedaNorm.includes(nombreAsigNorm);
              });
            }
            
            return encontrada;
          }).filter(Boolean);
          console.log(`📚 Asignaturas encontradas: ${asignaturas.length}/${asignaturasNombres.length}`);
        }

        // Parsear niveles múltiples (soporta con o sin paréntesis externos)
        let niveles = [];
        if (Nivel) {
          // Limpiar paréntesis externos si existen: "(Segundo, Cuarto)" -> "Segundo, Cuarto"
          let nivelesTexto = Nivel.trim();
          if (nivelesTexto.startsWith('(') && nivelesTexto.endsWith(')')) {
            nivelesTexto = nivelesTexto.slice(1, -1);
          }
          const nivelesNombres = nivelesTexto.split(',').map(n => n.trim());
          niveles = nivelesNombres.map(nombre => {
            const busquedaNorm = normalizar(nombre);
            
            // Primero: buscar coincidencia exacta
            let encontrado = todosNiveles.find(niv => {
              const nombreNivNorm = normalizar(niv.nombre);
              return nombreNivNorm === busquedaNorm;
            });
            
            // Si no: buscar que el nombre de la BD contenga la búsqueda
            if (!encontrado) {
              encontrado = todosNiveles.find(niv => {
                const nombreNivNorm = normalizar(niv.nombre);
                return nombreNivNorm.includes(busquedaNorm);
              });
            }
            
            // Si no: buscar que la búsqueda contenga el nombre de la BD
            if (!encontrado) {
              encontrado = todosNiveles.find(niv => {
                const nombreNivNorm = normalizar(niv.nombre);
                return busquedaNorm.includes(nombreNivNorm);
              });
            }
            
            return encontrado;
          }).filter(Boolean);
          console.log(`📊 Niveles encontrados: ${niveles.length}/${nivelesNombres.length}`);
        }

        // Parsear paralelos agrupados con tuplas
        // Soporta: "(A,B,C), (A,B)" o "((A,B,C), (A,B))" o "D,E"
        let paralelosGrupos = [];
        if (Paralelo) {
          let paralelosTexto = Paralelo.trim();
          
          // Limpiar dobles paréntesis externos: "((A,B), (C,D))" -> "(A,B), (C,D)"
          if (paralelosTexto.startsWith('((') && paralelosTexto.endsWith('))')) {
            paralelosTexto = paralelosTexto.slice(1, -1);
          }
          
          // Buscar grupos individuales: "(A,B,C)", "(A,B)"
          const gruposMatch = paralelosTexto.match(/\(([^)]+)\)/g);
          
          if (gruposMatch) {
            // Hay paréntesis: parsear cada grupo
            paralelosGrupos = gruposMatch.map(grupo => {
              const letras = grupo.replace(/[()]/g, '').split(',').map(p => p.trim());
              return letras.map(letra => {
                return todosParalelos.find(par => 
                  par.nombre.toLowerCase() === letra.toLowerCase() ||
                  par.codigo.toLowerCase() === letra.toLowerCase()
                );
              }).filter(Boolean);
            });
          } else {
            // Sin paréntesis: todos los paralelos en un solo grupo
            const letras = paralelosTexto.split(',').map(p => p.trim());
            const grupoUnico = letras.map(letra => {
              return todosParalelos.find(par => 
                par.nombre.toLowerCase() === letra.toLowerCase() ||
                par.codigo.toLowerCase() === letra.toLowerCase()
              );
            }).filter(Boolean);
            paralelosGrupos = [grupoUnico];
          }
        }

        // Parsear roles múltiples
        let roles = [];
        if (Rol) {
          roles = Rol.split(',').map(r => r.trim()).filter(r => r);
        }

        // Validar que tengamos datos para crear registros
        if (asignaturas.length === 0 || niveles.length === 0) {
          resultados.fallidos.push({ 
            fila, 
            error: 'Debe especificar al menos una asignatura y un nivel válidos' 
          });
          continue;
        }

        // Validar que la cantidad de asignaturas = niveles = grupos de paralelos
        if (asignaturas.length !== niveles.length) {
          resultados.fallidos.push({ 
            fila, 
            error: `Cantidad de asignaturas (${asignaturas.length}) no coincide con niveles (${niveles.length})` 
          });
          continue;
        }

        if (paralelosGrupos.length > 0 && paralelosGrupos.length !== asignaturas.length) {
          resultados.fallidos.push({ 
            fila, 
            error: `Cantidad de grupos de paralelos (${paralelosGrupos.length}) no coincide con asignaturas (${asignaturas.length})` 
          });
          continue;
        }

        // Crear múltiples registros: uno por cada combinación
        let registrosCreados = 0;
        const combinaciones = [];

        for (let i = 0; i < asignaturas.length; i++) {
          const asignatura = asignaturas[i];
          const nivel = niveles[i];
          const paralelosDelNivel = paralelosGrupos[i] || [];

          if (paralelosDelNivel.length > 0) {
            // Crear un registro por cada paralelo
            for (const paralelo of paralelosDelNivel) {
              combinaciones.push({ asignatura, nivel, paralelo });
            }
          } else {
            // Sin paralelos especificados
            combinaciones.push({ asignatura, nivel, paralelo: null });
          }
        }

        // Crear los profesores
        for (let idx = 0; idx < combinaciones.length; idx++) {
          const { asignatura, nivel, paralelo } = combinaciones[idx];
          
          // Email único: agregar sufijo si hay múltiples registros
          const email = combinaciones.length > 1 
            ? baseEmail.replace('@', `${idx + 1}@`)
            : baseEmail;

          // Verificar si ya existe
          const existente = await Profesor.findOne({ where: { email } });
          if (existente) {
            continue; // Saltar este registro
          }

          // Generar contraseña temporal y token
          const tempPassword = crypto.randomBytes(8).toString('hex');
          const hashedPassword = await bcrypt.hash(tempPassword, 12);
          const { resetToken, hashedToken, expirationDate } = createPasswordResetToken();

          // Crear el profesor
          await Profesor.create({
            nombres,
            apellidos,
            email,
            carrera_id: carrera.id,
            activo: true,
            asignatura_id: asignatura.id,
            nivel_id: nivel.id,
            paralelo_id: paralelo ? paralelo.id : null,
            roles: roles,
            password: hashedPassword,
            passwordResetToken: hashedToken,
            passwordResetExpires: new Date(expirationDate)
          });

          registrosCreados++;

          // Enviar email de bienvenida solo al primero
          if (idx === 0) {
            try {
              const profesorTemp = { nombres, apellidos, email: baseEmail };
              await sendPasswordSetupEmail(profesorTemp, resetToken);
            } catch (emailError) {
              console.error(`Error al enviar email a ${email}:`, emailError);
            }
          }
        }

        resultados.exitosos.push({
          nombre: `${nombres} ${apellidos}`,
          emailBase: baseEmail,
          registrosCreados,
          combinaciones: combinaciones.map(c => ({
            asignatura: c.asignatura.nombre,
            nivel: c.nivel.nombre,
            paralelo: c.paralelo ? c.paralelo.nombre : 'Sin paralelo'
          })),
          roles
        });
        resultados.registrosCreados += registrosCreados;
        console.log(`✅ Docente procesado: ${nombres} ${apellidos} - ${registrosCreados} registros creados`);

      } catch (error) {
        console.error('❌ Error al procesar fila:', error);
        resultados.fallidos.push({ 
          fila, 
          error: error.message 
        });
      }
    }

    // Limpiar archivo temporal
    fs.unlinkSync(filePath);
    console.log(`✅ Importación completada: ${resultados.exitosos.length} exitosos, ${resultados.fallidos.length} fallidos, ${resultados.registrosCreados} registros creados`);

    // Si todos fallaron, devolver error 422
    if (resultados.exitosos.length === 0 && resultados.fallidos.length > 0) {
      console.log('❌ Todos los registros fallaron. Detalles:');
      resultados.fallidos.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.error}`);
        console.log(`      Fila:`, f.fila);
      });
      
      return res.status(422).json({
        success: false,
        message: `Proceso completado con errores. ${resultados.exitosos.length} de ${resultados.total} docentes fueron creados.`,
        errors: resultados.fallidos.map(f => ({
          error: f.error,
          docente: f.fila?.Docente || 'Desconocido',
          carrera: f.fila?.Carrera || 'N/A',
          asignatura: f.fila?.Asinatura || 'N/A'
        }))
      });
    }

    return res.status(200).json({
      success: true,
      message: `Importación completada: ${resultados.exitosos.length} docentes procesados, ${resultados.registrosCreados} registros creados, ${resultados.fallidos.length} fallidos`,
      data: resultados
    });

  } catch (error) {
    console.error('❌❌ Error FATAL en importación CSV:', error);
    console.error('Stack:', error.stack);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Error al procesar el archivo CSV', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// --- EXPORTACIÓN CSV CON FORMATO DE TUPLAS ---
exports.exportCSV = async (req, res) => {
  try {
    // Obtener todos los profesores con sus relaciones
    const profesores = await Profesor.findAll({
      include: [
        { model: Carrera, as: 'carrera', attributes: ['nombre'] },
        { model: db.Asignatura, as: 'asignatura', attributes: ['nombre'] },
        { model: db.Nivel, as: 'nivel', attributes: ['nombre'] },
        { model: db.Paralelo, as: 'paralelo', attributes: ['nombre'] }
      ],
      order: [['apellidos', 'ASC'], ['nombres', 'ASC']]
    });

    // Agrupar profesores por nombre completo para detectar duplicados
    const profesoresAgrupados = {};

    profesores.forEach(prof => {
      const nombreCompleto = `${prof.nombres} ${prof.apellidos}`.trim();
      if (!profesoresAgrupados[nombreCompleto]) {
        profesoresAgrupados[nombreCompleto] = {
          nombres: prof.nombres,
          apellidos: prof.apellidos,
          carrera: prof.carrera?.nombre || '',
          roles: prof.roles || [],
          combinaciones: []
        };
      }

      // Agregar la combinación asignatura-nivel-paralelo
      profesoresAgrupados[nombreCompleto].combinaciones.push({
        asignatura: prof.asignatura?.nombre || '',
        nivel: prof.nivel?.nombre || '',
        paralelo: prof.paralelo?.nombre || ''
      });
    });

    // Construir filas CSV con formato de tuplas
    const filasCSV = [];

    Object.values(profesoresAgrupados).forEach(docente => {
      // Agrupar combinaciones por asignatura-nivel
      const grupos = {};
      
      docente.combinaciones.forEach(combo => {
        const key = `${combo.asignatura}|||${combo.nivel}`;
        if (!grupos[key]) {
          grupos[key] = {
            asignatura: combo.asignatura,
            nivel: combo.nivel,
            paralelos: []
          };
        }
        if (combo.paralelo) {
          grupos[key].paralelos.push(combo.paralelo);
        }
      });

      const gruposArray = Object.values(grupos);

      if (gruposArray.length > 0) {
        // Construir strings con formato de tuplas
        const asignaturas = gruposArray.map(g => g.asignatura).join(', ');
        const niveles = gruposArray.map(g => g.nivel).join(', ');
        const paralelos = gruposArray.map(g => 
          g.paralelos.length > 0 ? `(${g.paralelos.join(',')})` : ''
        ).filter(p => p).join(', ');

        filasCSV.push({
          Docente: `${docente.nombres} ${docente.apellidos}`,
          Carrera: docente.carrera,
          Asinatura: asignaturas,
          Nivel: niveles,
          Paralelo: paralelos || '',
          Rol: docente.roles.join(', ')
        });
      }
    });

    // Crear workbook y worksheet
    const worksheet = xlsx.utils.json_to_sheet(filasCSV);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Docentes');

    // Generar buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'csv' });

    // Enviar archivo
    res.setHeader('Content-Disposition', 'attachment; filename=docentes_export.csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error al exportar CSV:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al exportar el archivo CSV', 
      error: error.message 
    });
  }
};


exports.bulkCreate = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo.' });
  }

  const errors = [];
  const filePath = req.file.path;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    fs.unlinkSync(filePath);

    const newProfesoresData = []; // Usamos un array temporal para guardar datos extra

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2;

      if (!row.nombres || !row.apellidos || !row.email || !row.carrera_nombre) {
        errors.push(`Fila ${rowNumber}: Faltan datos obligatorios.`);
        continue;
      }

      try {
        const carrera = await Carrera.findOne({ where: { nombre: String(row.carrera_nombre).trim() } });
        if (!carrera) {
          errors.push(`Fila ${rowNumber}: La carrera "${row.carrera_nombre}" no fue encontrada.`);
          continue;
        }

        const existente = await Profesor.findOne({ where: { email: String(row.email).trim() } });
        if (existente) {
          errors.push(`Fila ${rowNumber}: El email "${row.email}" ya está en uso.`);
          continue;
        }

        // --- NUEVO: Generar contraseña y token para cada profesor ---
        const tempPassword = crypto.randomBytes(8).toString('hex'); // Contraseña temporal que no se usará
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        const { resetToken, hashedToken, expirationDate } = createPasswordResetToken();

        newProfesoresData.push({
          nombres: String(row.nombres).trim(),
          apellidos: String(row.apellidos).trim(),
          email: String(row.email).trim(),
          carrera_id: carrera.id,
          activo: true,
          // --- NUEVO: Añadir campos de seguridad ---
          password: hashedPassword,
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(expirationDate),
          // Guardamos el token sin hashear aquí temporalmente para enviarlo por correo después
          rawResetToken: resetToken,
        });

      } catch (dbError) {
        errors.push(`Fila ${rowNumber}: Error de base de datos. ${dbError.message}`);
      }
    }

    if (newProfesoresData.length > 0) {
      // Sequelize ignora 'rawResetToken' porque no está en el modelo, lo cual es perfecto.
      await Profesor.bulkCreate(newProfesoresData);

      // --- NUEVO: Enviar correos a todos los profesores creados ---
      for (const profData of newProfesoresData) {
        await sendPasswordSetupEmail(profData, profData.rawResetToken);
      }
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Proceso completado con errores. ${newProfesoresData.length} de ${jsonData.length} docentes fueron creados.`,
        errors: errors,
      });
    }

    res.status(201).json({
      success: true,
      message: `${newProfesoresData.length} docentes fueron creados exitosamente. Se han enviado los correos de bienvenida.`,
    });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Error al procesar el archivo Excel:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar el archivo Excel.', error: error.message });
  }
};

// --- CREAR UN NUEVO PROFESOR (MODIFICADO) ---
exports.create = async (req, res) => {
  try {
    const { nombres, apellidos, email, carrera, activo, asignatura_id, nivel_id, paralelo_id, roles } = req.body;

    if (!nombres || !apellidos || !email || !carrera) {
      return res.status(400).json({ success: false, message: 'Nombres, apellidos, email y carrera son obligatorios.' });
    }
    
    const existente = await Profesor.findOne({ where: { email } });
    if (existente) {
      return res.status(400).json({ success: false, message: `Ya existe un profesor con el email ${email}` });
    }
    
    // --- NUEVO: Generar contraseña temporal y token ---
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const { resetToken, hashedToken, expirationDate } = createPasswordResetToken();

    const nuevoProfesor = await Profesor.create({
      nombres,
      apellidos,
      email,
      carrera_id: carrera,
      activo: activo !== undefined ? activo : true,
      asignatura_id: asignatura_id || null,
      nivel_id: nivel_id || null,
      paralelo_id: paralelo_id || null,
      roles: roles && Array.isArray(roles) ? roles : [],
      // --- NUEVO: Añadir los campos de seguridad al crear ---
      password: hashedPassword,
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(expirationDate)
    });

    // --- NUEVO: Enviar el correo de bienvenida ---
    await sendPasswordSetupEmail(nuevoProfesor, resetToken);
    
    // La respuesta no debería incluir datos sensibles como el token.
    // El método toJSON del modelo de Sequelize (si lo configuraste) ayuda a ocultar estos campos.
    return res.status(201).json({ success: true, message: 'Profesor creado exitosamente. Se ha enviado un email para configurar la contraseña.', data: nuevoProfesor });

  } catch (error) {
    console.error('Error al crear profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al crear el profesor', error: error.message });
  }
};
// --- ACTUALIZAR UN PROFESOR ---
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, email, carrera, activo, asignatura_id, nivel_id, paralelo_id, roles } = req.body;

    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({ success: false, message: `Profesor con ID ${id} no encontrado` });
    }

    // Si se cambia el email, verificar que no esté en uso por OTRO profesor
    if (email && email !== profesor.email) {
      const existente = await Profesor.findOne({ where: { email, id: { [Op.ne]: id } } });
      if (existente) {
        return res.status(400).json({ success: false, message: `El email ${email} ya está en uso por otro profesor` });
      }
    }

    await profesor.update({
      nombres: nombres || profesor.nombres,
      apellidos: apellidos || profesor.apellidos,
      email: email || profesor.email,
      carrera_id: carrera || profesor.carrera_id,
      activo: activo !== undefined ? activo : profesor.activo,
      asignatura_id: asignatura_id !== undefined ? asignatura_id : profesor.asignatura_id,
      nivel_id: nivel_id !== undefined ? nivel_id : profesor.nivel_id,
      paralelo_id: paralelo_id !== undefined ? paralelo_id : profesor.paralelo_id,
      roles: roles !== undefined ? (Array.isArray(roles) ? roles : []) : profesor.roles
    });

    return res.status(200).json({ success: true, message: 'Profesor actualizado exitosamente', data: profesor });
  } catch (error) {
    console.error('Error al actualizar profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el profesor', error: error.message });
  }
};

// --- ELIMINAR UN PROFESOR ---
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({ success: false, message: `Profesor con ID ${id} no encontrado` });
    }

    await profesor.destroy(); // Usará borrado lógico (soft delete) si está configurado en el modelo
    
    return res.status(200).json({ success: true, message: 'Profesor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar el profesor', error: error.message });
  }
};
// --- LIMPIAR PROFESORES DUPLICADOS O DE PRUEBA ---
exports.cleanTestProfessors = async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar un array de emails para eliminar' });
    }
    console.log('?? Limpiando profesores de prueba:', emails);
    const profesoresEliminados = await Profesor.destroy({ where: { email: { [Op.in]: emails } }, force: true });
    console.log(`?? Eliminados ${profesoresEliminados} profesores`);
    return res.status(200).json({ success: true, message: `${profesoresEliminados} profesores eliminados exitosamente`, count: profesoresEliminados });
  } catch (error) {
    console.error('? Error al limpiar profesores:', error);
    return res.status(500).json({ success: false, message: 'Error al limpiar profesores', error: error.message });
  }
};
