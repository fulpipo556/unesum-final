// Ruta: routes/datosAcademicos.routes.js
const express = require('express');
const router = express.Router();
const facultadController = require('../controllers/facultad.controller');
const carreraController = require('../controllers/carrera.controller');
const nivelController = require('../controllers/nivel.Controller');
const paraleloController = require('../controllers/paralelo.controller');
const asignaturaController = require('../controllers/asignaturaController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
// Proteger todas las rutas, cualquier usuario logueado puede ver esta info
router.use(authenticate);
router.use(authorize(['administrador']));
router.get('/facultades', facultadController.getAll);
router.get('/carreras', carreraController.getAll);
router.get('/niveles', nivelController.getAll);
router.get('/paralelos', paraleloController.getAll);
router.get('/asignaturas', asignaturaController.getAllAsignaturas);
router.get('/facultades', facultadController.getAll);
router.post('/facultades', facultadController.create);
router.put('/facultades/:id', facultadController.update);
router.delete('/facultades/:id', facultadController.delete);

// --- Rutas para Carreras ---
router.get('/carreras', carreraController.getAll);
router.post('/carreras', carreraController.create);
router.put('/carreras/:id', carreraController.update);
router.delete('/carreras/:id', carreraController.delete);
module.exports = router;