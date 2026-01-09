-- Script para crear la tabla roles en Neon (PostgreSQL)

-- Crear tipo ENUM para estado
DO $$ BEGIN
    CREATE TYPE rol_estado AS ENUM ('activo', 'inactivo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    estado rol_estado NOT NULL DEFAULT 'activo',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_roles_codigo ON roles(codigo);
CREATE INDEX IF NOT EXISTS idx_roles_nombre ON roles(nombre);
CREATE INDEX IF NOT EXISTS idx_roles_estado ON roles(estado);

-- Insertar roles por defecto
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

-- Comentarios en la tabla y columnas
COMMENT ON TABLE roles IS 'Tabla de roles del sistema académico';
COMMENT ON COLUMN roles.codigo IS 'Código único autogenerado para el rol';
COMMENT ON COLUMN roles.nombre IS 'Nombre del rol (administrador, docente, estudiante, etc.)';
COMMENT ON COLUMN roles.estado IS 'Estado del rol (activo/inactivo)';
