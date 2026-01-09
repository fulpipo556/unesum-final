const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/usuariosGestion.controller');

// Configurar multer para manejar archivos en memoria
const upload = multer({ storage: multer.memoryStorage() });

// Listar usuarios con asociaciones
router.get('/', ctrl.list);
// Crear usuario
router.post('/', ctrl.create);
// Actualizar usuario
router.put('/:id', ctrl.update);
// Exportación
router.get('/export', ctrl.export);
// Importación masiva
router.post('/import', upload.single('file'), ctrl.import);

module.exports = router;