-- Script para agregar columna de roles a la tabla profesores
-- Fecha: 2026-01-04

-- Agregar columna roles como array de strings
ALTER TABLE profesores 
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- Agregar comentario a la columna
COMMENT ON COLUMN profesores.roles IS 'Array de nombres de roles asignados al profesor';

-- Crear índice para mejorar las búsquedas por roles
CREATE INDEX IF NOT EXISTS idx_profesores_roles ON profesores USING GIN(roles);

-- Mostrar estructura actualizada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profesores' AND column_name = 'roles';
