const express = require('express');
const router = express.Router();
const programaAnaliticoController = require('../controllers/programaAnaliticoController');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * Rutas para gestión de programas analíticos
 * Base path: /api/programa-analitico
 */

// Descargar plantilla de Excel (sin autenticación para facilitar el acceso)
router.get('/plantilla', programaAnaliticoController.descargarPlantilla);

// Obtener estructura del formulario desde BD
router.get('/estructura-formulario', authenticate, programaAnaliticoController.getEstructuraFormulario);

// Subir programa analítico desde Excel (con autenticación)
router.post('/upload', authenticate, programaAnaliticoController.uploadExcel);

// Obtener todos los programas analíticos
router.get('/', authenticate, programaAnaliticoController.getAll);

// Obtener un programa analítico por ID
router.get('/:id', authenticate, programaAnaliticoController.getById);

// Eliminar un programa analítico
router.delete('/:id', authenticate, programaAnaliticoController.delete);

module.exports = router;
