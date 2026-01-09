const { sequelize } = require('../models');
const Rol = sequelize.models.rol;

// Obtener todos los roles
exports.getAll = async (req, res) => {
  try {
    const roles = await Rol.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error al obtener roles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los roles',
      error: error.message
    });
  }
};

// Obtener un Rol por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rol = await Rol.findByPk(id);
    
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: `Rol con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: rol
    });
  } catch (error) {
    console.error('Error al obtener el rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el rol',
      error: error.message
    });
  }
};

// Crear un nuevo rol
exports.create = async (req, res) => {
  try {
    const { nombre, estado } = req.body;
    
    // Validaciones básicas
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es un campo obligatorio'
      });
    }
    
    // Verificar si ya existe un rol con el mismo nombre
    const existente = await Rol.findOne({ where: { nombre: nombre.toLowerCase() } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un rol con el nombre "${nombre}"`
      });
    }
    
    // Crear el nuevo rol (el código se genera automáticamente por el hook)
    const nuevoRol = await Rol.create({
      nombre: nombre.toLowerCase(),
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente',
      data: nuevoRol
    });
  } catch (error) {
    console.error('Error al crear el rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el rol',
      error: error.message
    });
  }
};

// Actualizar un Rol
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, estado } = req.body;
    
    // Validación básica
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es un campo obligatorio'
      });
    }
    
    // Buscar el rol a actualizar
    const rol = await Rol.findByPk(id);
    
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: `Rol con ID ${id} no encontrado`
      });
    }
    
    // Verificar si el nuevo nombre ya existe (excepto el actual)
    if (nombre.toLowerCase() !== rol.nombre) {
      const { Op } = require('sequelize');
      const existente = await Rol.findOne({ 
        where: { 
          nombre: nombre.toLowerCase(),
          id: { [Op.ne]: id }
        } 
      });
      if (existente) {
        return res.status(400).json({
          success: false,
          message: `Ya existe un rol con el nombre "${nombre}"`
        });
      }
    }
    
    // Actualizar los campos (el código no se modifica)
    await rol.update({
      nombre: nombre.toLowerCase(),
      estado: estado || rol.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Rol actualizado exitosamente',
      data: rol
    });
  } catch (error) {
    console.error('Error al actualizar el rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el rol',
      error: error.message
    });
  }
};

// Cambiar el estado del Rol
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
    
    const rol = await Rol.findByPk(id);
    
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: `Rol con ID ${id} no encontrado`
      });
    }
    
    await rol.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado del rol cambiado a ${estado}`,
      data: rol
    });
  } catch (error) {
    console.error('Error al cambiar estado del rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del rol',
      error: error.message
    });
  }
};

// Eliminar un Rol
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rol = await Rol.findByPk(id);
    
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: `Rol con ID ${id} no encontrado`
      });
    }
    
    // Verificar si el rol está siendo usado (aquí podrías agregar validaciones adicionales)
    // Por ejemplo, verificar si hay usuarios con este rol
    
    await rol.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Rol eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar el rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el rol',
      error: error.message
    });
  }
};
