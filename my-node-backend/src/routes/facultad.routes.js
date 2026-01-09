const express = require('express');
const router = express.Router();
const facultadController = require('../controllers/facultad.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Rutas públicas (si necesitas que sean accesibles sin auth)
router.get('/', facultadController.getAll);

// Rutas protegidas
router.post('/', authenticate, authorize(['administrador']), facultadController.create);
router.put('/:id', authenticate, authorize(['administrador']), facultadController.update);
router.delete('/:id', authenticate, authorize(['administrador']), facultadController.delete);

module.exports = router;
