-- ============================================
-- SCRIPT PARA OBTENER TODOS LOS IDs
-- Ejecuta esto en tu base de datos para ver los IDs disponibles
-- ============================================

-- ROLES
SELECT '=== ROLES ===' as tabla;
SELECT id, nombre, codigo FROM roles ORDER BY id;

-- FACULTADES
SELECT '=== FACULTADES ===' as tabla;
SELECT id, nombre FROM facultades ORDER BY id;

-- CARRERAS
SELECT '=== CARRERAS ===' as tabla;
SELECT id, nombre, codigo, facultad_id FROM carreras ORDER BY id;

-- NIVELES/CURSOS
SELECT '=== NIVELES/CURSOS ===' as tabla;
SELECT id, nombre, codigo FROM nivel ORDER BY id;

-- ASIGNATURAS/MATERIAS
SELECT '=== ASIGNATURAS/MATERIAS ===' as tabla;
SELECT id, nombre, codigo, carrera_id FROM asignaturas ORDER BY carrera_id, id;

-- RESUMEN GENERAL
SELECT '=== RESUMEN ===' as tabla;
SELECT 
  (SELECT COUNT(*) FROM roles) as total_roles,
  (SELECT COUNT(*) FROM facultades) as total_facultades,
  (SELECT COUNT(*) FROM carreras) as total_carreras,
  (SELECT COUNT(*) FROM nivel) as total_niveles,
  (SELECT COUNT(*) FROM asignaturas) as total_asignaturas;
