-- Crear tablas pivot para gestión de usuarios
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='usuario_roles') THEN
    CREATE TABLE usuario_roles (
      id BIGSERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
      rol_id INTEGER NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(usuario_id, rol_id)
    );
    CREATE INDEX idx_usuario_roles_usuario_id ON usuario_roles(usuario_id);
    CREATE INDEX idx_usuario_roles_rol_id ON usuario_roles(rol_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='usuario_facultades') THEN
    CREATE TABLE usuario_facultades (
      id BIGSERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
      facultad_id INTEGER NOT NULL REFERENCES facultades(id) ON UPDATE CASCADE ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(usuario_id, facultad_id)
    );
    CREATE INDEX idx_usuario_facultades_usuario_id ON usuario_facultades(usuario_id);
    CREATE INDEX idx_usuario_facultades_facultad_id ON usuario_facultades(facultad_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name='usuario_carreras') THEN
    CREATE TABLE usuario_carreras (
      id BIGSERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
      carrera_id INTEGER NOT NULL REFERENCES carreras(id) ON UPDATE CASCADE ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(usuario_id, carrera_id)
    );
    CREATE INDEX idx_usuario_carreras_usuario_id ON usuario_carreras(usuario_id);
    CREATE INDEX idx_usuario_carreras_carrera_id ON usuario_carreras(carrera_id);
  END IF;
END $$;

-- Agregar columnas opcionales para username y password_hash en usuarios
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='username') THEN
    ALTER TABLE usuarios ADD COLUMN username VARCHAR(100);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='password_hash') THEN
    ALTER TABLE usuarios ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;
