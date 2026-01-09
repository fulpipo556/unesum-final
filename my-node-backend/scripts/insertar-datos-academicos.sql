-- =========================================================================
-- Script para insertar datos académicos reales en la base de datos
-- Universidad Estatal del Sur de Manabí (UNESUM)
-- =========================================================================

BEGIN;

-- 1. Limpiar tablas (opcional - comenta esta sección si quieres mantener datos existentes)
-- TRUNCATE TABLE profesores CASCADE;
-- TRUNCATE TABLE asignaturas CASCADE;
-- TRUNCATE TABLE carreras CASCADE;
-- TRUNCATE TABLE facultades CASCADE;
-- TRUNCATE TABLE nivel CASCADE;
-- TRUNCATE TABLE paralelo CASCADE;

-- 2. Insertar Facultades
INSERT INTO facultades (nombre) VALUES
('Facultad de Ciencias Técnicas')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Insertar Carreras
INSERT INTO carreras (nombre, facultad_id) VALUES
('Tecnologías de la Información', (SELECT id FROM facultades WHERE nombre = 'Facultad de Ciencias Técnicas' LIMIT 1)),
('Ingeniería en Sistemas', (SELECT id FROM facultades WHERE nombre = 'Facultad de Ciencias Técnicas' LIMIT 1)),
('Ingeniería en Computación', (SELECT id FROM facultades WHERE nombre = 'Facultad de Ciencias Técnicas' LIMIT 1))
ON CONFLICT (nombre) DO NOTHING;

-- 4. Insertar Niveles
INSERT INTO nivel (codigo, nombre, estado) VALUES
('1', 'Primero', 'activo'),
('2', 'Segundo', 'activo'),
('3', 'Tercero', 'activo'),
('4', 'Cuarto', 'activo'),
('5', 'Quinto', 'activo'),
('6', 'Sexto', 'activo'),
('7', 'Séptimo', 'activo'),
('8', 'Octavo', 'activo')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, estado = EXCLUDED.estado;

-- 5. Insertar Paralelos
INSERT INTO paralelo (codigo, nombre, estado) VALUES
('A', 'A', 'activo'),
('B', 'B', 'activo'),
('C', 'C', 'activo'),
('D', 'D', 'activo'),
('E', 'E', 'activo')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, estado = EXCLUDED.estado;

-- 6. Insertar Organizaciones Curriculares (si no existen)
INSERT INTO organizacion (codigo, nombre, estado) VALUES
('ORG-001', 'Formación Básica', 'activo'),
('ORG-002', 'Formación Profesional', 'activo'),
('ORG-003', 'Formación Especializada', 'activo')
ON CONFLICT DO NOTHING;

-- 7. Insertar Asignaturas para Tecnologías de la Información
INSERT INTO asignaturas (nombre, codigo, estado, carrera_id, nivel_id, organizacion_id) VALUES
-- Nivel 1
('Introducción a la Programación', 'TI-101', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '1' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-001' LIMIT 1)),
    
('Matemáticas Discretas', 'TI-102', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '1' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-001' LIMIT 1)),

-- Nivel 2
('Programación I', 'TI-201', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '2' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-001' LIMIT 1)),
    
('Estructuras de Datos', 'TI-202', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '2' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-001' LIMIT 1)),

-- Nivel 3
('Programación II', 'TI-301', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '3' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-002' LIMIT 1)),
    
('Bases de Datos', 'TI-302', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '3' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-002' LIMIT 1)),

-- Nivel 4
('Programación III', 'TI-401', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '4' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-002' LIMIT 1)),
    
('Desarrollo Web', 'TI-402', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '4' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-002' LIMIT 1)),
    
('Redes de Computadoras', 'TI-403', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '4' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-002' LIMIT 1)),

-- Nivel 5
('Ingeniería de Software', 'TI-501', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '5' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-002' LIMIT 1)),
    
('Seguridad Informática', 'TI-502', 'activo', 
    (SELECT id FROM carreras WHERE nombre = 'Tecnologías de la Información' LIMIT 1),
    (SELECT id FROM nivel WHERE codigo = '5' LIMIT 1),
    (SELECT id FROM organizacion WHERE codigo = 'ORG-003' LIMIT 1))

ON CONFLICT (codigo) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    estado = EXCLUDED.estado;

COMMIT;

-- Verificar datos insertados
SELECT 'Facultades:' as tabla, COUNT(*) as total FROM facultades
UNION ALL
SELECT 'Carreras:', COUNT(*) FROM carreras
UNION ALL
SELECT 'Niveles:', COUNT(*) FROM nivel
UNION ALL
SELECT 'Paralelos:', COUNT(*) FROM paralelo
UNION ALL
SELECT 'Asignaturas:', COUNT(*) FROM asignaturas;

-- Mostrar asignaturas de TI
SELECT 
    a.id,
    a.codigo,
    a.nombre,
    n.nombre as nivel,
    c.nombre as carrera
FROM asignaturas a
JOIN nivel n ON a.nivel_id = n.id
JOIN carreras c ON a.carrera_id = c.id
WHERE c.nombre = 'Tecnologías de la Información'
ORDER BY n.codigo, a.codigo;
