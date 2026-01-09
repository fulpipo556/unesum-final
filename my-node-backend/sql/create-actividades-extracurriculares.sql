-- Migración: Crear tabla actividades_extracurriculares
-- Fecha: 2026-01-02
-- Descripción: Tabla para almacenar actividades extracurriculares por periodo académico

-- Crear la tabla
CREATE TABLE IF NOT EXISTS actividades_extracurriculares (
    id SERIAL PRIMARY KEY,
    periodo_id INTEGER NOT NULL,
    semana VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    actividades TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_actividades_extracurriculares_periodo
        FOREIGN KEY (periodo_id) 
        REFERENCES periodos(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_actividades_extracurriculares_periodo 
    ON actividades_extracurriculares(periodo_id);

CREATE INDEX IF NOT EXISTS idx_actividades_extracurriculares_semana 
    ON actividades_extracurriculares(semana);

CREATE INDEX IF NOT EXISTS idx_actividades_extracurriculares_fechas 
    ON actividades_extracurriculares(fecha_inicio, fecha_fin);

-- Comentarios de la tabla y columnas
COMMENT ON TABLE actividades_extracurriculares IS 'Tabla para almacenar actividades extracurriculares planificadas por semana y periodo académico';
COMMENT ON COLUMN actividades_extracurriculares.periodo_id IS 'Referencia al periodo académico';
COMMENT ON COLUMN actividades_extracurriculares.semana IS 'Número de semana (1-16)';
COMMENT ON COLUMN actividades_extracurriculares.fecha_inicio IS 'Fecha de inicio de la actividad';
COMMENT ON COLUMN actividades_extracurriculares.fecha_fin IS 'Fecha de fin de la actividad';
COMMENT ON COLUMN actividades_extracurriculares.actividades IS 'Descripción de las actividades extracurriculares';

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'actividades_extracurriculares'
ORDER BY 
    ordinal_position;
