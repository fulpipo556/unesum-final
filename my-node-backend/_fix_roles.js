const db = require('./src/models');

async function fix() {
  try {
    // 1. Columna roles en profesores
    await db.sequelize.query("ALTER TABLE public.profesores ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}'");
    console.log('OK: columna roles en profesores');

    // 2. Tabla roles
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        estado VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('OK: tabla roles');

    // 3. Tablas junction para usuarios
    const junctions = [
      `CREATE TABLE IF NOT EXISTS public.usuario_roles (
        id BIGSERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        rol_id INTEGER NOT NULL REFERENCES roles(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, rol_id)
      )`,
      `CREATE TABLE IF NOT EXISTS public.usuario_facultades (
        id BIGSERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        facultad_id INTEGER NOT NULL REFERENCES facultades(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, facultad_id)
      )`,
      `CREATE TABLE IF NOT EXISTS public.usuario_carreras (
        id BIGSERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        carrera_id INTEGER NOT NULL REFERENCES carreras(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, carrera_id)
      )`,
      `CREATE TABLE IF NOT EXISTS public.usuario_niveles (
        id BIGSERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        nivel_id INTEGER NOT NULL REFERENCES nivel(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, nivel_id)
      )`,
      `CREATE TABLE IF NOT EXISTS public.usuario_asignaturas (
        id BIGSERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, asignatura_id)
      )`
    ];
    for (const sql of junctions) {
      await db.sequelize.query(sql);
    }
    console.log('OK: tablas junction creadas');

    // Verificar
    const [tables] = await db.sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'usuario_%' ORDER BY tablename"
    );
    console.log('Tablas junction:', tables.map(t => t.tablename).join(', '));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

fix();
