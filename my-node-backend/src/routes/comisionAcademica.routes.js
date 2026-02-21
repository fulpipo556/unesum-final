// comisionAcademica.routes.js
// Rutas para la Comisión Académica

const express = require('express');
const router = express.Router();
const comisionAcademicaController = require('../controllers/comisionAcademicaController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * Rutas para Comisión Académica
 * Base path: /api/comision-academica
 */

// 🏫 OBTENER ESTRUCTURA COMPLETA DE LA FACULTAD (carreras, mallas, asignaturas)
router.get('/estructura-facultad', 
  authenticate, 
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.obtenerEstructuraFacultad
);

// 📚 OBTENER ASIGNATURAS DE UNA CARRERA ESPECÍFICA
router.get('/carreras/:carrera_id/asignaturas', 
  authenticate, 
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.obtenerAsignaturasCarrera
);

module.exports = router;

