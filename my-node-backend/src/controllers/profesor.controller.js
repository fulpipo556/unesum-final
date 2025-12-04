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
    return res.status(200).json({ success: true, data: profesores });
  } catch (error) {
    console.error('Error al obtener profesores:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener los profesores', error: error.message });
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
    const { nombres, apellidos, email, carrera, activo, asignatura_id, nivel_id, paralelo_id } = req.body;

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
    const { nombres, apellidos, email, carrera, activo, asignatura_id, nivel_id, paralelo_id } = req.body;

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
      paralelo_id: paralelo_id !== undefined ? paralelo_id : profesor.paralelo_id
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