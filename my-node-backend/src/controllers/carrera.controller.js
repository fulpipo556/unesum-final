// Ruta: controllers/carrera.controller.js

const db = require('../models');
const Carrera = db.Carrera;
const Facultad = db.Facultad;

// --- OBTENER TODAS LAS CARRERAS ---
exports.getAll = async (req, res) => {
  try {
    const carreras = await Carrera.findAll({
      order: [['nombre', 'ASC']],
      // Incluir la información de la facultad a la que pertenece cada carrera
      include: {
        model: Facultad,
        as: 'facultad',
        attributes: ['id', 'nombre']
      }
    });
    
    return res.status(200).json({
      success: true,
      data: carreras
    });
  } catch (error) {
    console.error('Error al obtener carreras:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las carreras',
      error: error.message
    });
  }
};
exports.create = async (req, res) => {
  try {
    const { nombre, facultad_id } = req.body;
    if (!nombre || !facultad_id) {
      return res.status(400).json({ success: false, message: 'Nombre y facultad son obligatorios.' });
    }
    const nuevaCarrera = await Carrera.create({ nombre, facultad_id });
    res.status(201).json({ success: true, message: 'Carrera creada exitosamente', data: nuevaCarrera });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear la carrera', error: error.message });
  }
};

// ACTUALIZAR
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, facultad_id } = req.body;
    const carrera = await Carrera.findByPk(id);
    if (!carrera) {
      return res.status(404).json({ success: false, message: 'Carrera no encontrada.' });
    }
    await carrera.update({ nombre, facultad_id });
    res.status(200).json({ success: true, message: 'Carrera actualizada exitosamente', data: carrera });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar la carrera', error: error.message });
  }
};

// ELIMINAR
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const carrera = await Carrera.findByPk(id);
    if (!carrera) {
      return res.status(404).json({ success: false, message: 'Carrera no encontrada.' });
    }
    await carrera.destroy();
    res.status(200).json({ success: true, message: 'Carrera eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar la carrera', error: error.message });
  }
};