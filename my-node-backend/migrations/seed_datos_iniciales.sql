-- Script para insertar datos iniciales en la base de datos
-- Ejecutar después de las migraciones

-- ======================================
-- INSERTAR ROLES (si no existen)
-- ======================================
INSERT INTO roles (codigo, nombre, estado, created_at, updated_at) VALUES
    ('ROL-0001', 'administrador', 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ROL-0002', 'docente', 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ROL-0003', 'profesor', 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ROL-0004', 'estudiante', 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ROL-0005', 'comision', 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ROL-0006', 'direccion', 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ROL-0007', 'decano', 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ROL-0008', 'subdecano', 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (nombre) DO NOTHING;

-- ======================================
-- INSERTAR FACULTADES (ejemplos)
-- ======================================
INSERT INTO facultades (id, nombre, "createdAt", "updatedAt") VALUES
    (1, 'Facultad de Ciencias de la Salud', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Facultad de Ingeniería', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'Facultad de Ciencias Económicas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 'Facultad de Ciencias Sociales', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ======================================
-- INSERTAR CARRERAS (ejemplos)
-- ======================================
INSERT INTO carreras (id, nombre, codigo, facultad_id, "createdAt", "updatedAt") VALUES
    (1, 'Enfermería', 'ENF', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Medicina', 'MED', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'Ingeniería en Sistemas', 'INSIS', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 'Ingeniería Civil', 'INCIV', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (5, 'Economía', 'ECO', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (6, 'Contabilidad', 'CONT', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (7, 'Trabajo Social', 'TSOC', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (8, 'Psicología', 'PSI', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ======================================
-- INSERTAR NIVELES (1° a 10° semestre)
-- ======================================
INSERT INTO nivel (id, nombre, codigo, "createdAt", "updatedAt") VALUES
    (1, 'Primer Semestre', '1S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Segundo Semestre', '2S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'Tercer Semestre', '3S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 'Cuarto Semestre', '4S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (5, 'Quinto Semestre', '5S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (6, 'Sexto Semestre', '6S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (7, 'Séptimo Semestre', '7S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (8, 'Octavo Semestre', '8S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (9, 'Noveno Semestre', '9S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (10, 'Décimo Semestre', '10S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ======================================
-- INSERTAR ASIGNATURAS (ejemplos por carrera)
-- ======================================
-- Asignaturas para Enfermería (carrera_id=1)
INSERT INTO asignaturas (id, nombre, codigo, carrera_id, "createdAt", "updatedAt") VALUES
    (1, 'Anatomía Humana', 'ENF-101', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Fisiología', 'ENF-102', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'Enfermería Básica', 'ENF-103', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 'Farmacología', 'ENF-201', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (5, 'Cuidados Intensivos', 'ENF-301', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Asignaturas para Ingeniería en Sistemas (carrera_id=3)
INSERT INTO asignaturas (id, nombre, codigo, carrera_id, "createdAt", "updatedAt") VALUES
    (6, 'Programación I', 'INSIS-101', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (7, 'Programación II', 'INSIS-102', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (8, 'Base de Datos', 'INSIS-201', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (9, 'Redes de Computadoras', 'INSIS-202', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (10, 'Ingeniería de Software', 'INSIS-301', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Asignaturas para Economía (carrera_id=5)
INSERT INTO asignaturas (id, nombre, codigo, carrera_id, "createdAt", "updatedAt") VALUES
    (11, 'Microeconomía', 'ECO-101', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (12, 'Macroeconomía', 'ECO-102', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (13, 'Estadística Aplicada', 'ECO-201', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (14, 'Econometría', 'ECO-301', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ======================================
-- VERIFICAR DATOS INSERTADOS
-- ======================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Roles: %', (SELECT COUNT(*) FROM roles);
    RAISE NOTICE '✅ Facultades: %', (SELECT COUNT(*) FROM facultades);
    RAISE NOTICE '✅ Carreras: %', (SELECT COUNT(*) FROM carreras);
    RAISE NOTICE '✅ Niveles: %', (SELECT COUNT(*) FROM nivel);
    RAISE NOTICE '✅ Asignaturas: %', (SELECT COUNT(*) FROM asignaturas);
END $$;
