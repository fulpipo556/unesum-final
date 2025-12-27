// comisionAcademica.routes.js
// Rutas para la Comisión Académica

const express = require('express');
const router = express.Router();
const comisionAcademicaController = require('../controllers/comisionAcademicaController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const multer = require('multer');

// Configurar multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Use Excel (.xlsx, .xls).'));
    }
  }
});

/**
 * Rutas para Comisión Académica
 * Base path: /api/comision-academica
 */

// 📊 PROCESAR SYLLABUS COMPLETO (Excel)
router.post('/procesar-syllabus', 
  authenticate, 
  authorize(['administrador', 'comision_academica']),
  upload.fields([{ name: 'archivo', maxCount: 1 }]), 
  comisionAcademicaController.procesarSyllabusCompleto
);

// 📋 LISTAR TODOS LOS SYLLABUS
router.get('/syllabus', 
  authenticate,
  authorize(['administrador', 'comision_academica']),
  comisionAcademicaController.listarSyllabusComision
);

// 📄 OBTENER SYLLABUS ESPECÍFICO
router.get('/syllabus/:sessionId', 
  authenticate,
  authorize(['administrador', 'comision_academica', 'profesor', 'docente']),
  comisionAcademicaController.obtenerSyllabusComision
);

// 🗑️ ELIMINAR SYLLABUS
router.delete('/syllabus/:sessionId', 
  authenticate,
  authorize(['administrador', 'comision_academica']),
  comisionAcademicaController.eliminarSyllabusComision
);

module.exports = router;
