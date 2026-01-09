const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rol.Controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Rutas GET: autenticadas pero sin restricción de rol
router.get('/', authenticate, rolController.getAll);
router.get('/:id', authenticate, rolController.getById);

// Rutas POST, PUT, DELETE: solo administradores
router.post('/', authenticate, authorize(['administrador']), rolController.create);
router.put('/:id', authenticate, authorize(['administrador']), rolController.update);
router.patch('/:id/status', authenticate, authorize(['administrador']), rolController.changeStatus);
router.delete('/:id', authenticate, authorize(['administrador']), rolController.delete);

module.exports = router;