// comisionAcademicaController.js
// Controlador para la Comisión Académica

const db = require('../models');

// 🏫 OBTENER ESTRUCTURA COMPLETA DE LA FACULTAD O CARRERA ESPECÍFICA
exports.obtenerEstructuraFacultad = async (req, res) => {
  try {
    const user = req.user;
    
    console.log('👤 Usuario:', {
      id: user.id,
      nombre: user.nombres,
      rol: user.rol,
      facultad: user.facultad,
      carrera: user.carrera,
      carrera_id: user.carrera_id
    });
    
    // CASO 1: Si el usuario tiene carrera_id asignada, mostrar SOLO esa carrera
    if (user.carrera_id) {
      console.log(`🎓 ✅ CASO 1: Usuario tiene carrera_id asignada: ${user.carrera_id}`);
      
      const carrera = await db.Carrera.findByPk(user.carrera_id, {
        include: [
          {
            model: db.Facultad,
            as: 'facultad',
            attributes: ['id', 'nombre']
          },
          {
            model: db.Malla,
            as: 'mallas',
            required: false
          },
          {
            model: db.Asignatura,
            as: 'asignaturas',
            required: false,
            include: [
              {
                model: db.Nivel,
                as: 'nivel',
                attributes: ['id', 'nombre']
              }
            ]
          }
        ]
      });
      
      if (!carrera) {
        return res.status(404).json({
          success: false,
          message: 'Carrera no encontrada'
        });
      }
      
      const estructura = {
        facultad: {
          id: carrera.facultad.id,
          nombre: carrera.facultad.nombre
        },
        carreras: [{
          id: carrera.id,
          nombre: carrera.nombre,
          mallas: carrera.mallas || [],
          asignaturas: (carrera.asignaturas || []).map(asig => ({
            id: asig.id,
            nombre: asig.nombre,
            codigo: asig.codigo,
            nivel: asig.nivel ? asig.nivel.nombre : 'Sin nivel',
            estado: asig.estado,
            tiene_syllabus: false,
            syllabus_id: null,
            tiene_programa: false,
            programa_id: null
          }))
        }]
      };
      
      console.log('📦 RESPUESTA (CASO 1 - Una sola carrera):', {
        facultad: estructura.facultad.nombre,
        total_carreras: estructura.carreras.length,
        carrera: estructura.carreras[0].nombre,
        total_asignaturas: estructura.carreras[0].asignaturas.length
      });
      
      return res.status(200).json({
        success: true,
        data: estructura
      });
    }
    
    // CASO 2: Si no tiene carrera_id pero tiene facultad, mostrar todas las carreras
    if (!user.facultad) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no tiene una facultad ni carrera asignada'
      });
    }
    
    console.log(`🏫 ⚠️ CASO 2: Usuario NO tiene carrera_id, usando facultad: ${user.facultad}`);
    
    // Buscar la facultad
    const facultad = await db.Facultad.findOne({
      where: { nombre: user.facultad }
    });
    
    if (!facultad) {
      return res.status(404).json({
        success: false,
        message: 'Facultad no encontrada'
      });
    }
    
    // Obtener todas las carreras de la facultad
    const carreras = await db.Carrera.findAll({
      where: { facultad_id: facultad.id },
      order: [['nombre', 'ASC']],
      include: [
        {
          model: db.Malla,
          as: 'mallas',
          required: false
        },
        {
          model: db.Asignatura,
          as: 'asignaturas',
          required: false,
          include: [
            {
              model: db.Nivel,
              as: 'nivel',
              attributes: ['id', 'nombre']
            }
          ]
        }
      ]
    });
    
    // Construir la estructura jerárquica
    const estructura = {
      facultad: {
        id: facultad.id,
        nombre: facultad.nombre
      },
      carreras: carreras.map(carrera => ({
        id: carrera.id,
        nombre: carrera.nombre,
        mallas: carrera.mallas || [],
        asignaturas: (carrera.asignaturas || []).map(asig => ({
          id: asig.id,
          nombre: asig.nombre,
          codigo: asig.codigo,
          nivel: asig.nivel ? asig.nivel.nombre : 'Sin nivel',
          estado: asig.estado,
          tiene_syllabus: false,
          syllabus_id: null,
          tiene_programa: false,
          programa_id: null
        }))
      }))
    };
    
    console.log('📦 RESPUESTA (CASO 2 - Todas las carreras):', {
      facultad: estructura.facultad.nombre,
      total_carreras: estructura.carreras.length,
      carreras: estructura.carreras.map(c => c.nombre)
    });
    
    return res.status(200).json({
      success: true,
      data: estructura
    });
    
  } catch (error) {
    console.error('❌ Error al obtener estructura de facultad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la estructura de la facultad',
      error: error.message
    });
  }
};

// 📚 OBTENER ASIGNATURAS DE UNA CARRERA ESPECÍFICA
exports.obtenerAsignaturasCarrera = async (req, res) => {
  try {
    const { carrera_id } = req.params;
    const user = req.user;
    
    // Verificar que la carrera pertenezca a la facultad del usuario
    const carrera = await db.Carrera.findByPk(carrera_id, {
      include: [
        {
          model: db.Facultad,
          as: 'facultad',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    if (!carrera) {
      return res.status(404).json({
        success: false,
        message: 'Carrera no encontrada'
      });
    }
    
    // Si es comision_academica, validar que sea de su facultad o carrera
    if (user.rol === 'comision_academica' || user.rol === 'comision') {
      // Si tiene carrera_id, validar que sea su carrera
      if (user.carrera_id && carrera.id !== user.carrera_id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a esta carrera'
        });
      }
      
      // Si no tiene carrera_id pero tiene facultad, validar facultad
      if (!user.carrera_id && carrera.facultad.nombre !== user.facultad) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a esta carrera'
        });
      }
    }
    
    // Obtener asignaturas
    const asignaturas = await db.Asignatura.findAll({
      where: { carrera_id: carrera_id },
      order: [['nombre', 'ASC']],
      include: [
        {
          model: db.Nivel,
          as: 'nivel',
          attributes: ['id', 'nombre']
        },
        {
          model: db.Organizacion,
          as: 'organizacion',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    // Mapear asignaturas
    const asignaturasConInfo = asignaturas.map(asig => ({
      id: asig.id,
      nombre: asig.nombre,
      codigo: asig.codigo,
      estado: asig.estado,
      nivel: asig.nivel ? asig.nivel.nombre : null,
      organizacion: asig.organizacion ? asig.organizacion.nombre : null,
      tiene_syllabus: false,
      syllabus_id: null,
      tiene_programa: false,
      programa_id: null
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        carrera: {
          id: carrera.id,
          nombre: carrera.nombre,
          facultad: carrera.facultad.nombre
        },
        asignaturas: asignaturasConInfo
      }
    });
    
  } catch (error) {
    console.error('❌ Error al obtener asignaturas de carrera:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las asignaturas',
      error: error.message
    });
  }
};

module.exports = exports;
