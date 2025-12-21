const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { Usuario } = require('../models');
const Administrador = db.Usuario; // Modelo para administradores
const Profesor = db.Profesor; 
exports.login = async (req, res) => {
  try {
    const { correo_electronico, contraseña } = req.body;
    if (!correo_electronico || !contraseña) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos.' });
    }

    let user = null;
    let rol = null;

    // 1. Intentar encontrar al usuario como Administrador/Usuario
    // Asumiendo que tu modelo se llama 'usuarios' en la BD
    const admin = await db.Usuario.findOne({ where: { correo_electronico: correo_electronico } }); // O db.Administrador

    if (admin) {
      // --- ¡CAMBIO CRÍTICO AQUÍ! ---
      // Accede a la propiedad 'contraseña' que coincide con la columna de la base de datos.
      const isPasswordCorrect = await bcrypt.compare(contraseña, admin.contraseña);
      if (isPasswordCorrect) {
        user = admin;
        rol = 'administrador'; // O admin.rol si lo tienes en la tabla
      }
    }

    // 2. Si no es un admin válido, intentar como Profesor
    if (!user) {
      const profesor = await db.Profesor.findOne({ where: { email: correo_electronico } });
      if (profesor) {
        // --- SIN CAMBIOS AQUÍ ---
        // La propiedad 'password' es correcta para la tabla de profesores.
        const isPasswordCorrect = await bcrypt.compare(contraseña, profesor.password);
        if (isPasswordCorrect) {
          user = profesor;
          rol = 'profesor';
        }
      }
    }

    // 3. Si no se encontró a nadie, rechazar
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    // --- El resto de la función es idéntica y correcta ---
    const payload = { id: user.id, rol: rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    const userResponse = user.toJSON();
    // Elimina la propiedad correcta de la respuesta para no exponer el hash
    delete userResponse.password; 
    delete userResponse.contraseña; 
    userResponse.rol = rol; 

    res.json({ success: true, token, user: userResponse });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
};
exports.register = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.contraseña, 10);
    const userData = {
      ...req.body,
      contraseña: hashedPassword,
      estado: true
    };

    const user = await Usuario.create(userData);
    
    // Excluir la contraseña de la respuesta
    const userResponse = user.toJSON();
    delete userResponse.contraseña;
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: userResponse
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ 
        success: false,
        message: 'El correo o cédula ya existe' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: 'Error del servidor' 
      });
    }
  }
};
exports.getMe = async (req, res) => {
    // Si llegamos aquí, el middleware de autenticación ya ha hecho su trabajo.
    // El ID del usuario está en req.user.id (o como lo hayas configurado).
    try {
        // Busca al usuario en AMBAS tablas para estar seguros.
        // CORRECCIÓN: Usar db.Usuario en lugar de db.Administrador
        let user = await db.Usuario.findByPk(req.user.id);
        if (!user && db.Profesor) {
            user = await db.Profesor.findByPk(req.user.id);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado." });
        }

        const userResponse = user.toJSON();
        delete userResponse.password;
        userResponse.rol = req.user.rol; // Añade el rol desde el token

        res.json({ success: true, user: userResponse });

    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ success: false, message: "Error del servidor." });
    }
};