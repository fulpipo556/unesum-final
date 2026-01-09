require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addRolesToProfesores() {
  try {
    console.log('\n🔧 Agregando columna de roles a la tabla profesores...\n');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../sql/add-roles-to-profesores.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await pool.query(sql);
    
    console.log('✅ Columna roles agregada exitosamente\n');
    
    // Verificar la estructura
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'profesores' AND column_name = 'roles'
    `);
    
    if (result.rows.length > 0) {
      console.log('📊 Estructura de la columna roles:');
      console.log(result.rows[0]);
    }
    
    console.log('\n✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error al agregar columna roles:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

addRolesToProfesores();
