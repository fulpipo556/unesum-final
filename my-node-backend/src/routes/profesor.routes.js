// Ruta: routes/profesor.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const profesorController = require('../controllers/profesor.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Configurar multer para archivos CSV
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  }
});

// Middleware para autenticar y autorizar solo a administradores
router.post('/reset-password/:token', profesorController.resetPassword);
router.use(authenticate);

// Ruta específica DEBE ir ANTES de las rutas genéricas
router.get('/my-syllabi', authorize(['profesor', 'docente']), profesorController.getMySyllabi);

// Ruta para importación masiva CSV
router.post('/upload', authorize(['administrador']), upload.single('file'), profesorController.uploadCSV);

// Ruta para exportación CSV con tuplas
router.get('/export', authorize(['administrador']), profesorController.exportCSV);

// Rutas CRUD para profesores
router.get('/', profesorController.getAll);
router.post('/', profesorController.create);
router.put('/:id', profesorController.update);
router.delete('/:id', profesorController.delete);

module.exports = router;