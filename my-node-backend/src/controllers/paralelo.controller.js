const { sequelize } = require('../models');
const Paralelo = sequelize.models.paralelo;


// Obtener todos los paralelos
exports.getAll = async (req, res) => {
  try {
    const paralelos = await Paralelo.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: paralelos // Corregido
    });
  } catch (error) {
    console.error('Error al obtener paralelos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los paralelos',
      error: error.message
    });
  }
};

// Obtener un Paralelo por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const paralelo = await Paralelo.findByPk(id); // Renombrado
    
    if (!paralelo) { // Renombrado
      return res.status(404).json({
        success: false,
        message: `Paralelo con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: paralelo // Renombrado
    });
  } catch (error) {
     console.error('Error al obtener paralelos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los paralelos',
      error: error.message
    });
  }
};


// Crear una nuevo paralelo
exports.create = async (req, res) => {
  try {
    const { codigo, nombre, estado } = req.body;
    
    // Validaciones básicas
    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'El código y nombre son campos obligatorios'
      });
    }
    
    // Verificar si ya existe un paralelo con el mismo código
    const existente = await Paralelo.findOne({ where: { codigo } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un paralelo con el código ${codigo}`
      });
    }
    
    // Crear la nueva función
    const nuevoParalelo = await Paralelo.create({
      codigo,
      nombre,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Paralelo creado exitosamente',
      data: nuevoParalelo
    });
  } catch (error) {
    console.error('Error al crear el paralelo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el paralelo',
      error: error.message
    });
  }
};

// Actualizar un Paralelo
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, estado } = req.body;
    
    // Buscar la función a actualizar
    const paralelo = await Paralelo.findByPk(id);
    
    if (!paralelo) {
      return res.status(404).json({
        success: false,
        message: `Paralelo con ID ${id} no encontrada`
      });
    }
    
    // Si se cambia el código, verificar que no exista otro con ese código
    if (codigo && codigo !== paralelo.codigo) {
      const existente = await Paralelo.findOne({ where: { codigo } });
      if (existente) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otro Paralelo con el código ${codigo}`
        });
      }
    }
    
    // Actualizar los campos
    await paralelo.update({
      codigo: codigo || paralelo.codigo,
      nombre: nombre || paralelo.nombre,
      estado: estado || paralelo.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Paralelo actualizado exitosamente',
      data: paralelo
    });
  } catch (error) {
    console.error('Error al actualizar el paralelo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el paralelo',
      error: error.message
    });
  }
};

// Cambiar el estado del Paralelo
exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!estado || !['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'El estado debe ser "activo" o "inactivo"'
      });
    }
    
    const paralelo = await Paralelo.findByPk(id);
    
    if (!paralelo) {
      return res.status(404).json({
        success: false,
        message: `Paralelo con ID ${id} no encontrada`
      });
    }
    
    await paralelo.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado del Paralelo cambiado a ${estado}`,
      data: paralelo
    });
  } catch (error) {
    console.error('Error al cambiar estado del Paralelo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del Paralelo',
      error: error.message
    });
  }
};

// Eliminar un Paralelo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const paralelo = await Paralelo.findByPk(id);
    
    if (!paralelo) {
      return res.status(404).json({
        success: false,
        message: `Paralelo con ID ${id} no encontrada`
      });
    }
    
    await paralelo.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Paralelo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar el paralelo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el paralelo',
      error: error.message
    });
  }
};