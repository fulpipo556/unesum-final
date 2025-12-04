const { sequelize } = require('../models');
const Periodo = sequelize.models.periodos;


// Obtener todos los periodos
exports.getAll = async (req, res) => {
  try {
    const periodos = await Periodo.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: periodos // Corregido
    });
  } catch (error) {
    console.error('Error al obtener periodos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los periodos',
      error: error.message
    });
  }
};

// Obtener un Periodo por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const periodos = await Periodo.findByPk(id); // Renombrado
    
    if (!periodos) { // Renombrado
      return res.status(404).json({
        success: false,
        message: `Periodo con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: periodos // Renombrado
    });
  } catch (error) {
     console.error('Error al obtener los periodos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los periodos',
      error: error.message
    });
  }
};


// Crear una nuevo periodo
exports.create = async (req, res) => {
  try {
    const { codigo, nombre, estado } = req.body;
    
    // Validaciones básicas
    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'El código y periodo son campos obligatorios'
      });
    }
    
    // Verificar si ya existe un periodo con el mismo código
    const existente = await Periodo.findOne({ where: { codigo } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un periodo con el código ${codigo}`
      });
    }
    
    // Crear la nueva función
    const nuevoPeriodo = await Periodo.create({
      codigo,
      nombre,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Periodo creado exitosamente',
      data: nuevoPeriodo
    });
  } catch (error) {
    console.error('Error al crear el periodo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el periodo',
      error: error.message
    });
  }
};

// Actualizar un Periodo
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, estado } = req.body;
    
    // Buscar la función a actualizar
    const periodo= await Periodo.findByPk(id);
    
    if (!periodo) {
      return res.status(404).json({
        success: false,
        message: `Periodo con ID ${id} no encontrada`
      });
    }
    
    // Si se cambia el código, verificar que no exista otro con ese código
    if (codigo && codigo !== periodo.codigo) {
      const existente = await Periodo.findOne({ where: { codigo } });
      if (existente) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otro Periodo con el código ${codigo}`
        });
      }
    }
    
    // Actualizar los campos
    await periodo.update({
      codigo: codigo || periodo.codigo,
      nombre: nombre || periodo.nombre,
      estado: estado || periodo.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Periodo actualizado exitosamente',
      data: periodo
    });
  } catch (error) {
    console.error('Error al actualizar el periodo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el periodo',
      error: error.message
    });
  }
};

// Cambiar el estado del Periodo
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
    
    const periodo = await Periodo.findByPk(id);
    
    if (!periodo) {
      return res.status(404).json({
        success: false,
        message: `Periodo con ID ${id} no encontrada`
      });
    }
    
    await periodo.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado del Periodo cambiado a ${estado}`,
      data: periodo
    });
  } catch (error) {
    console.error('Error al cambiar estado del Periodo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del Periodo',
      error: error.message
    });
  }
};

// Eliminar un Periodo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const periodo = await Periodo.findByPk(id);
    
    if (!periodo) {
      return res.status(404).json({
        success: false,
        message: `Periodo con ID ${id} no encontrada`
      });
    }
    
    await periodo.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Periodo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar el periodo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el periodo',
      error: error.message
    });
  }
};