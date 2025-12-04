const { Malla, Facultad, Carrera } = require('../models');

// Obtener todas las mallas
exports.getAllMallas = async (req, res) => {
    try {
        const mallas = await Malla.findAll({
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre']
                }
            ],
            order: [['fecha_creacion', 'DESC']]
        });
        
        return res.status(200).json({ success: true, data: mallas });
    } catch (error) {
        console.error('Error al obtener las mallas:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las mallas', 
            error: error.message 
        });
    }
};

// Buscar malla por código
exports.getMallaByCodigo = async (req, res) => {
    try {
        const { codigo } = req.params;
        
        const malla = await Malla.findOne({
            where: { codigo_malla: codigo },
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre', 'facultad_id']
                }
            ]
        });
        
        if (!malla) {
            return res.status(404).json({ 
                success: false, 
                message: 'Malla no encontrada' 
            });
        }
        
        return res.status(200).json({ success: true, data: malla });
    } catch (error) {
        console.error('Error al buscar la malla:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al buscar la malla', 
            error: error.message 
        });
    }
};

// Crear nueva malla
exports.createMalla = async (req, res) => {
    try {
        const { codigo_malla, facultad_id, carrera_id } = req.body;
        
        // Validar datos requeridos
        if (!codigo_malla || !facultad_id || !carrera_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Código de malla, facultad y carrera son requeridos' 
            });
        }
        
        // Verificar si ya existe una malla con ese código
        const mallaExistente = await Malla.findOne({ 
            where: { codigo_malla } 
        });
        
        if (mallaExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya existe una malla con ese código' 
            });
        }
        
        const nuevaMalla = await Malla.create({
            codigo_malla,
            facultad_id: parseInt(facultad_id),
            carrera_id: parseInt(carrera_id)
        });
        
        // Cargar la malla con sus relaciones
        const mallaCompleta = await Malla.findByPk(nuevaMalla.id, {
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre']
                }
            ]
        });
        
        return res.status(201).json({ 
            success: true, 
            message: 'Malla creada exitosamente',
            data: mallaCompleta 
        });
    } catch (error) {
        console.error('Error al crear la malla:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al crear la malla', 
            error: error.message 
        });
    }
};

// Actualizar malla
exports.updateMalla = async (req, res) => {
    try {
        const { id } = req.params;
        const { facultad_id, carrera_id } = req.body;
        
        const malla = await Malla.findByPk(id);
        
        if (!malla) {
            return res.status(404).json({ 
                success: false, 
                message: 'Malla no encontrada' 
            });
        }
        
        await malla.update({
            facultad_id: facultad_id ? parseInt(facultad_id) : malla.facultad_id,
            carrera_id: carrera_id ? parseInt(carrera_id) : malla.carrera_id
        });
        
        const mallaActualizada = await Malla.findByPk(id, {
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre']
                }
            ]
        });
        
        return res.status(200).json({ 
            success: true, 
            message: 'Malla actualizada exitosamente',
            data: mallaActualizada 
        });
    } catch (error) {
        console.error('Error al actualizar la malla:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar la malla', 
            error: error.message 
        });
    }
};

// Eliminar malla
exports.deleteMalla = async (req, res) => {
    try {
        const { id } = req.params;
        
        const malla = await Malla.findByPk(id);
        
        if (!malla) {
            return res.status(404).json({ 
                success: false, 
                message: 'Malla no encontrada' 
            });
        }
        
        await malla.destroy();
        
        return res.status(200).json({ 
            success: true, 
            message: 'Malla eliminada exitosamente' 
        });
    } catch (error) {
        console.error('Error al eliminar la malla:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar la malla', 
            error: error.message 
        });
    }
};
