const { sequelize } = require('../models');

const Organizacion = sequelize.models.organizacion;


// Obtener todos los niveles
exports.getAll = async (req, res) => {
  try {
    const organizacion_curricular = await Organizacion.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data:organizacion_curricular  // Corregido
    });
  } catch (error) {
    console.error('Error al obtener las Unidades de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las Unidades de organización curricular',
      error: error.message
    });
  }
};

// Obtener una Unidad de organización curricular por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const organizacion_curricular = await Organizacion.findByPk(id); // Renombrado
    
    if (!organizacion_curricular) { // Renombrado
      return res.status(404).json({
        success: false,
        message: `Unidad organización curricular con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: organizacion_curricular // Renombrado
    });
  } catch (error) {
     console.error('Error al obtener las Unidades de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las Unidades de organización curricular',
      error: error.message
    });
  }
};


// Crear una nuevo nivel
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
    
    // Verificar si ya existe un nivel con el mismo código
    const existente = await Organizacion.findOne({ where: { codigo } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una Unidad de Organización curricular con el código ${codigo}`
      });
    }
    
    // Crear la nueva función
    const nuevoOrganizacion = await Organizacion.create({
      codigo,
      nombre,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Unidad de Organización curricular creado exitosamente',
      data: nuevoOrganizacion
    });
  } catch (error) {
    console.error('Error al crear la Unidad de Organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la Unidad de organización curricular',
      error: error.message
    });
  }
};

// Actualizar un Nivel
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, estado } = req.body;
    
    // Buscar la función a actualizar
    const organizacion_curricular = await Organizacion.findByPk(id);
    
    if (!organizacion_curricular) {
      return res.status(404).json({
        success: false,
        message: `Unidad de organización curricular con ID ${id} no encontrada`
      });
    }
    
    // Si se cambia el código, verificar que no exista otro con ese código
    if (codigo && codigo !== organizacion_curricular.codigo) {
      const existente = await Organizacion.findOne({ where: { codigo } });
      if (existente) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otra Unidad de organización curricular con el código ${codigo}`
        });
      }
    }
    
    // Actualizar los campos
    await organizacion_curricular.update({
      codigo: codigo || organizacion_curricular.codigo,
      nombre: nombre || organizacion_curricular.nombre,
      estado: estado || organizacion_curricular.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Unidad de organización curricular actualizado exitosamente',
      data: organizacion_curricular
    });
  } catch (error) {
    console.error('Error al actualizar la Unidad de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la Unidad de organización curricular',
      error: error.message
    });
  }
};

// Cambiar el estado de la Unidad de Organización Curricular
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
    
    const organizacion_curricular = await Organizacion.findByPk(id);
    
    if (!organizacion_curricular) {
      return res.status(404).json({
        success: false,
        message: `Unidad de organización curricular con ID ${id} no encontrada`
      });
    }
    
    await organizacion_curricular.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado de la Unidad de organización curricular a cambiado a ${estado}`,
      data: organizacion_curricular
    });
  } catch (error) {
    console.error('Error al cambiar estado de la Unidad de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado de la Unidad de organización curricular',
      error: error.message
    });
  }
};

// Eliminar un Paralelo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const organizacion_curricular = await Organizacion.findByPk(id);
    
    if (!organizacion_curricular) {
      return res.status(404).json({
        success: false,
        message: `Unidad de organización curricular con ID ${id} no encontrada`
      });
    }
    
    await organizacion_curricular.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Unidad de organización curricular eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar la unidad de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la unidad de organización curricular',
      error: error.message
    });
  }
};