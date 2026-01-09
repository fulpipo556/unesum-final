-- Agregar columnas faltantes a la tabla profesores
-- Ejecutar este script directamente en la base de datos PostgreSQL

-- 1. Agregar columna asignatura_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profesores' AND column_name = 'asignatura_id') THEN
        ALTER TABLE profesores ADD COLUMN asignatura_id BIGINT;
        ALTER TABLE profesores ADD CONSTRAINT fk_profesores_asignatura 
            FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) 
            ON UPDATE CASCADE ON DELETE SET NULL;
        CREATE INDEX idx_profesores_asignatura_id ON profesores(asignatura_id);
        RAISE NOTICE 'Columna asignatura_id agregada';
    ELSE
        RAISE NOTICE 'Columna asignatura_id ya existe';
    END IF;
END $$;

-- 2. Agregar columna nivel_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profesores' AND column_name = 'nivel_id') THEN
        ALTER TABLE profesores ADD COLUMN nivel_id BIGINT;
        ALTER TABLE profesores ADD CONSTRAINT fk_profesores_nivel 
            FOREIGN KEY (nivel_id) REFERENCES nivel(id) 
            ON UPDATE CASCADE ON DELETE SET NULL;
        CREATE INDEX idx_profesores_nivel_id ON profesores(nivel_id);
        RAISE NOTICE 'Columna nivel_id agregada';
    ELSE
        RAISE NOTICE 'Columna nivel_id ya existe';
    END IF;
END $$;

-- 3. Agregar columna paralelo_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profesores' AND column_name = 'paralelo_id') THEN
        ALTER TABLE profesores ADD COLUMN paralelo_id BIGINT;
        ALTER TABLE profesores ADD CONSTRAINT fk_profesores_paralelo 
            FOREIGN KEY (paralelo_id) REFERENCES paralelo(id) 
            ON UPDATE CASCADE ON DELETE SET NULL;
        CREATE INDEX idx_profesores_paralelo_id ON profesores(paralelo_id);
        RAISE NOTICE 'Columna paralelo_id agregada';
    ELSE
        RAISE NOTICE 'Columna paralelo_id ya existe';
    END IF;
END $$;

-- 4. Agregar columna roles si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profesores' AND column_name = 'roles') THEN
        ALTER TABLE profesores ADD COLUMN roles TEXT[] DEFAULT '{}';
        CREATE INDEX idx_profesores_roles ON profesores USING GIN(roles);
        RAISE NOTICE 'Columna roles agregada';
    ELSE
        RAISE NOTICE 'Columna roles ya existe';
    END IF;
END $$;

-- Verificar las columnas agregadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profesores'
ORDER BY ordinal_position;
