const express = require('express');
const router = express.Router();
const periodoController = require('../controllers/periodo.Controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Rutas GET: autenticadas pero sin restricción de rol
router.get('/', authenticate, periodoController.getAll);
router.get('/:id', authenticate, periodoController.getById);

// Rutas POST, PUT, DELETE: solo administradores
router.post('/', authenticate, authorize(['administrador']), periodoController.create);
router.put('/:id', authenticate, authorize(['administrador']), periodoController.update);
router.patch('/:id/estado', authenticate, authorize(['administrador']), periodoController.changeStatus);
router.delete('/:id', authenticate, authorize(['administrador']), periodoController.delete);

module.exports = router;