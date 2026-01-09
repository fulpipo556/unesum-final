-- Crear tablas pivot adicionales para niveles y asignaturas
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='usuario_niveles') THEN
    CREATE TABLE usuario_niveles (
      id BIGSERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
      nivel_id INTEGER NOT NULL REFERENCES nivel(id) ON UPDATE CASCADE ON DELETE CASCADE,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE(usuario_id, nivel_id)
    );
    CREATE INDEX idx_usuario_niveles_usuario_id ON usuario_niveles(usuario_id);
    CREATE INDEX idx_usuario_niveles_nivel_id ON usuario_niveles(nivel_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='usuario_asignaturas') THEN
    CREATE TABLE usuario_asignaturas (
      id BIGSERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
      asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON UPDATE CASCADE ON DELETE CASCADE,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE(usuario_id, asignatura_id)
    );
    CREATE INDEX idx_usuario_asignaturas_usuario_id ON usuario_asignaturas(usuario_id);
    CREATE INDEX idx_usuario_asignaturas_asignatura_id ON usuario_asignaturas(asignatura_id);
  END IF;
END $$;
