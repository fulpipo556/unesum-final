const express = require('express');
const router = express.Router();
const actividadesExtracurricularesController = require('../controllers/actividadesExtracurricularesController');
const { authenticate } = require('../middlewares/auth.middleware');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Rutas
router.get('/', actividadesExtracurricularesController.getAll);
router.get('/periodo/:periodo_id', actividadesExtracurricularesController.getByPeriodo);
router.get('/:id', actividadesExtracurricularesController.getById);
router.post('/', actividadesExtracurricularesController.create);
router.put('/:id', actividadesExtracurricularesController.update);
router.delete('/:id', actividadesExtracurricularesController.delete);

module.exports = router;
