const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createRolesTable() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Conectando a Neon PostgreSQL...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../sql/create-roles.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Ejecutando script SQL...');
    await client.query(sql);
    
    console.log('✅ Tabla roles creada exitosamente');
    
    // Verificar la creación
    console.log('\n📊 Verificando estructura de la tabla...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'roles'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Tabla "roles" existe en la base de datos');
      
      // Ver columnas
      const columnsCheck = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'roles'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Columnas de la tabla roles:');
      columnsCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (Nullable: ${col.is_nullable})`);
      });
      
      // Ver índices
      const indexesCheck = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'roles'
      `);
      
      console.log('\n🔍 Índices creados:');
      indexesCheck.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
      
      // Ver registros insertados
      const rolesCount = await client.query('SELECT COUNT(*) as count FROM roles');
      console.log(`\n👥 Total de roles insertados: ${rolesCount.rows[0].count}`);
      
      const rolesList = await client.query('SELECT codigo, nombre, estado FROM roles ORDER BY id');
      console.log('\n📋 Roles registrados:');
      rolesList.rows.forEach(rol => {
        console.log(`  - [${rol.codigo}] ${rol.nombre} (${rol.estado})`);
      });
      
    } else {
      console.log('❌ Error: La tabla "roles" no fue creada');
    }
    
  } catch (error) {
    console.error('❌ Error al crear la tabla:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

createRolesTable();
