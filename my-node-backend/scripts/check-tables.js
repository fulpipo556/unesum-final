const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando tablas en la base de datos...\n');
    
    // Buscar tablas relacionadas con periodo
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND table_name LIKE '%periodo%'
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas encontradas con "periodo":');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    if (result.rows.length === 0) {
      console.log('\n⚠️  No se encontraron tablas con "periodo" en el nombre');
      console.log('\n📋 Mostrando todas las tablas disponibles:');
      
      const allTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      allTables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
