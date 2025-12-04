const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabusController');
const multer = require('multer');

// Importamos los middlewares que vamos a usar
const { authenticate, authorize } = require('../middlewares/auth.middleware'); // Asegúrate que la ruta sea correcta

// Configuración de multer para la carga de archivos
const upload = multer({ dest: 'uploads/' });

// -------------------------------------------------------------------
// PASO 1: APLICAMOS LA AUTENTICACIÓN (authenticate) A TODAS LAS RUTAS
// Cualquier petición a /api/syllabi/* primero deberá verificar que el token es válido.
router.use(authenticate);
// -------------------------------------------------------------------

// -------------------------------------------------------------------
// PASO 2: APLICAMOS LA AUTORIZACIÓN (authorize) RUTA POR RUTA
// -------------------------------------------------------------------

// POST /api/syllabi/upload -> Subir documento Word y crear syllabus automáticamente
// PERMITIDO PARA: Ambos roles, profesores y administradores.
// IMPORTANTE: Esta ruta debe ir ANTES de las rutas genéricas para evitar conflictos
router.post('/upload', authorize(['profesor', 'administrador']), upload.single('file'), syllabusController.uploadDocument);

// POST /api/syllabi/upload-excel -> Subir archivo Excel y crear syllabus automáticamente
// PERMITIDO PARA: Ambos roles, profesores y administradores.
router.post('/upload-excel', authorize(['profesor', 'administrador']), upload.single('file'), syllabusController.uploadExcel);

// GET /api/syllabi/mine -> Obtener los syllabi del profesor logueado.
// PERMITIDO PARA: 'profesor' y 'administrador'.
// Es crucial que esta ruta esté ANTES de /:id para que "mine" no se confunda con un ID.
router.get('/mine', authorize(['profesor', 'administrador']), syllabusController.getMine);

// GET /api/syllabi -> Obtener TODOS los syllabi.
// Esta es una función de administrador, por lo que solo ellos pueden usarla.
// PERMITIDO PARA: 'administrador' únicamente.
router.get('/', authorize(['administrador']), syllabusController.getAll);

// POST /api/syllabi -> Crear un nuevo syllabus.
// PERMITIDO PARA: Ambos roles, profesores y administradores.
router.post('/', authorize(['profesor', 'administrador']), syllabusController.create);

// GET /api/syllabi/:id -> Obtener un syllabus específico por su ID.
// PERMITIDO PARA: Ambos roles (un profesor podría necesitar ver un syllabus específico).
router.get('/:id', authorize(['profesor', 'administrador']), syllabusController.getById);

// PUT /api/syllabi/:id -> Actualizar un syllabus existente.
// PERMITIDO PARA: Ambos roles. La lógica de "quién es el dueño" está dentro del controlador.
router.put('/:id', authorize(['profesor', 'administrador']), syllabusController.update);

// DELETE /api/syllabi/:id -> Eliminar (soft delete) un syllabus.
// PERMITIDO PARA: Ambos roles. La lógica de "quién es el dueño" está dentro del controlador.
router.delete('/:id', authorize(['profesor', 'administrador']), syllabusController.delete);

module.exports = router;