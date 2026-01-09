require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verificarRoles() {
  try {
    // Consultar todos los roles
    const result = await pool.query('SELECT * FROM roles ORDER BY id');
    
    console.log('\n📊 VERIFICACIÓN DE ROLES');
    console.log('='.repeat(50));
    console.log(`Total de roles: ${result.rows.length}\n`);
    
    result.rows.forEach((rol, index) => {
      console.log(`${index + 1}. ${rol.codigo} - ${rol.nombre}`);
      console.log(`   Estado: ${rol.estado}`);
      console.log(`   Creado: ${new Date(rol.created_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log('✅ Verificación completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error al verificar roles:', error.message);
  } finally {
    await pool.end();
  }
}

verificarRoles();
