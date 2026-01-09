const { ActividadesExtracurriculares, Periodo } = require('../models');
const { Op } = require('sequelize');

// Obtener todas las actividades extracurriculares
exports.getAll = async (req, res) => {
  try {
    const actividades = await ActividadesExtracurriculares.findAll({
      include: [
        {
          model: Periodo,
          as: 'periodo',
          attributes: ['id', 'nombre', 'codigo', 'fecha_inicio', 'fecha_fin']
        }
      ],
      order: [['periodo_id', 'DESC'], ['semana', 'ASC']]
    });

    res.json({
      success: true,
      data: actividades
    });
  } catch (error) {
    console.error('Error al obtener actividades extracurriculares:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las actividades extracurriculares',
      error: error.message
    });
  }
};

// Obtener actividades por periodo
exports.getByPeriodo = async (req, res) => {
  try {
    const { periodo_id } = req.params;

    const actividades = await ActividadesExtracurriculares.findAll({
      where: { periodo_id },
      include: [
        {
          model: Periodo,
          as: 'periodo',
          attributes: ['id', 'nombre', 'codigo', 'fecha_inicio', 'fecha_fin']
        }
      ],
      order: [['semana', 'ASC'], ['fecha_inicio', 'ASC']]
    });

    res.json({
      success: true,
      data: actividades
    });
  } catch (error) {
    console.error('Error al obtener actividades por periodo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las actividades del periodo',
      error: error.message
    });
  }
};

// Obtener una actividad por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const actividad = await ActividadesExtracurriculares.findByPk(id, {
      include: [
        {
          model: Periodo,
          as: 'periodo',
          attributes: ['id', 'nombre', 'codigo', 'fecha_inicio', 'fecha_fin']
        }
      ]
    });

    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: 'Actividad no encontrada'
      });
    }

    res.json({
      success: true,
      data: actividad
    });
  } catch (error) {
    console.error('Error al obtener actividad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la actividad',
      error: error.message
    });
  }
};

// Crear una nueva actividad
exports.create = async (req, res) => {
  try {
    const { periodo_id, semana, fecha_inicio, fecha_fin, actividades } = req.body;

    // Validar campos requeridos
    if (!periodo_id || !semana || !fecha_inicio || !fecha_fin || !actividades) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar que el periodo existe
    const periodo = await Periodo.findByPk(periodo_id);
    if (!periodo) {
      return res.status(404).json({
        success: false,
        message: 'El periodo especificado no existe'
      });
    }

    // Validar que las fechas estén dentro del rango del periodo
    if (periodo.fecha_inicio && periodo.fecha_fin) {
      const periodoInicio = new Date(periodo.fecha_inicio);
      const periodoFin = new Date(periodo.fecha_fin);
      const actividadInicio = new Date(fecha_inicio);
      const actividadFin = new Date(fecha_fin);

      if (actividadInicio < periodoInicio || actividadInicio > periodoFin) {
        return res.status(400).json({
          success: false,
          message: `La fecha de inicio debe estar entre ${periodo.fecha_inicio} y ${periodo.fecha_fin}`
        });
      }

      if (actividadFin < periodoInicio || actividadFin > periodoFin) {
        return res.status(400).json({
          success: false,
          message: `La fecha de fin debe estar entre ${periodo.fecha_inicio} y ${periodo.fecha_fin}`
        });
      }
    }

    // Validar que fecha_fin sea mayor que fecha_inicio
    if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // Crear la actividad
    const nuevaActividad = await ActividadesExtracurriculares.create({
      periodo_id,
      semana,
      fecha_inicio,
      fecha_fin,
      actividades
    });

    // Obtener la actividad con el periodo incluido
    const actividadCompleta = await ActividadesExtracurriculares.findByPk(nuevaActividad.id, {
      include: [
        {
          model: Periodo,
          as: 'periodo',
          attributes: ['id', 'nombre', 'codigo', 'fecha_inicio', 'fecha_fin']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Actividad creada exitosamente',
      data: actividadCompleta
    });
  } catch (error) {
    console.error('Error al crear actividad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la actividad',
      error: error.message
    });
  }
};

// Actualizar una actividad
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { periodo_id, semana, fecha_inicio, fecha_fin, actividades } = req.body;

    const actividad = await ActividadesExtracurriculares.findByPk(id);

    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: 'Actividad no encontrada'
      });
    }

    // Si se actualiza el periodo, verificar que existe
    if (periodo_id && periodo_id !== actividad.periodo_id) {
      const periodo = await Periodo.findByPk(periodo_id);
      if (!periodo) {
        return res.status(404).json({
          success: false,
          message: 'El periodo especificado no existe'
        });
      }
    }

    // Validar fechas si se actualizan
    if (fecha_inicio && fecha_fin) {
      if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de fin debe ser posterior a la fecha de inicio'
        });
      }
    }

    // Actualizar
    await actividad.update({
      periodo_id: periodo_id || actividad.periodo_id,
      semana: semana || actividad.semana,
      fecha_inicio: fecha_inicio || actividad.fecha_inicio,
      fecha_fin: fecha_fin || actividad.fecha_fin,
      actividades: actividades || actividad.actividades
    });

    // Obtener la actividad actualizada con el periodo
    const actividadActualizada = await ActividadesExtracurriculares.findByPk(id, {
      include: [
        {
          model: Periodo,
          as: 'periodo',
          attributes: ['id', 'nombre', 'codigo', 'fecha_inicio', 'fecha_fin']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Actividad actualizada exitosamente',
      data: actividadActualizada
    });
  } catch (error) {
    console.error('Error al actualizar actividad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la actividad',
      error: error.message
    });
  }
};

// Eliminar una actividad
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const actividad = await ActividadesExtracurriculares.findByPk(id);

    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: 'Actividad no encontrada'
      });
    }

    await actividad.destroy();

    res.json({
      success: true,
      message: 'Actividad eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la actividad',
      error: error.message
    });
  }
};
