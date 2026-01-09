const express = require('express');
const router = express.Router();
const carreraController = require('../controllers/carrera.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Rutas públicas (si necesitas que sean accesibles sin auth)
router.get('/', carreraController.getAll);

// Rutas protegidas
router.post('/', authenticate, authorize(['administrador']), carreraController.create);
router.put('/:id', authenticate, authorize(['administrador']), carreraController.update);
router.delete('/:id', authenticate, authorize(['administrador']), carreraController.delete);

module.exports = router;
