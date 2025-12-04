const express = require('express');
const router = express.Router();
const mallaController = require('../controllers/mallaController');
const { authenticate } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de mallas
router.get('/', mallaController.getAllMallas);
router.get('/codigo/:codigo', mallaController.getMallaByCodigo);
router.post('/', mallaController.createMalla);
router.put('/:id', mallaController.updateMalla);
router.delete('/:id', mallaController.deleteMalla);

module.exports = router;
