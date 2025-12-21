// syllabusExtractionRoutes.js
// Rutas para extracción de títulos de Syllabus y organización en pestañas

const express = require('express');
const router = express.Router();
const syllabusExtractionController = require('../controllers/syllabusExtractionController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const multer = require('multer');

// Configurar multer para subir archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(xlsx|xls|docx|doc)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Use Excel (.xlsx, .xls) o Word (.docx, .doc).'));
    }
  }
});

/**
 * Rutas para extracción de Syllabus
 * Base path: /api/syllabus-extraction
 */

// 📋 EXTRAER TÍTULOS de un archivo Syllabus (Excel o Word)
// Solo administradores pueden extraer
router.post('/extraer-titulos', 
  authenticate, 
  authorize(['administrador']),
  upload.fields([{ name: 'archivo', maxCount: 1 }]), 
  syllabusExtractionController.extraerTitulosSyllabus
);

// 📝 OBTENER TODAS LAS SESIONES DE EXTRACCIÓN
// Administradores y profesores pueden ver las sesiones
router.get('/sesiones', 
  authenticate,
  authorize(['administrador', 'profesor', 'docente']),
  syllabusExtractionController.listarSesionesSyllabus
);

// 📊 OBTENER TÍTULOS DE UNA SESIÓN ESPECÍFICA
// Administradores y docentes pueden ver los títulos
router.get('/sesion-extraccion/:sessionId/titulos', 
  authenticate,
  syllabusExtractionController.obtenerTitulosSesionSyllabus
);

// Obtener detalles completos de una sesión
router.get('/sesion-extraccion/:sessionId', 
  authenticate,
  syllabusExtractionController.obtenerTitulosSesionSyllabus
);

// 🗂️ AGRUPACIONES DE TÍTULOS EN PESTAÑAS

// Obtener agrupaciones de una sesión (admin y docentes)
router.get('/sesion-extraccion/:sessionId/agrupaciones', 
  authenticate,
  syllabusExtractionController.obtenerAgrupacionesSyllabus
);

// Guardar agrupaciones (solo administradores)
router.post('/sesion-extraccion/:sessionId/agrupaciones', 
  authenticate,
  authorize(['administrador']),
  syllabusExtractionController.guardarAgrupacionesSyllabus
);

// Eliminar agrupaciones (solo administradores)
router.delete('/sesion-extraccion/:sessionId/agrupaciones', 
  authenticate,
  authorize(['administrador']),
  syllabusExtractionController.eliminarAgrupacionesSyllabus
);

module.exports = router;
