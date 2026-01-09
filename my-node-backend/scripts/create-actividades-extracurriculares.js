const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de la conexión a Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // Leer el archivo SQL
    const sqlFilePath = path.join(__dirname, '../sql/create-actividades-extracurriculares.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📝 Ejecutando script SQL...');
    
    // Ejecutar el SQL
    await client.query(sql);
    
    console.log('✅ Tabla actividades_extracurriculares creada exitosamente!');
    
    // Verificar que la tabla existe
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'actividades_extracurriculares'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Verificación exitosa: La tabla existe en la base de datos');
      
      // Mostrar estructura de la tabla
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM 
          information_schema.columns
        WHERE 
          table_name = 'actividades_extracurriculares'
        ORDER BY 
          ordinal_position
      `);
      
      console.log('\n📋 Estructura de la tabla:');
      console.table(columnsResult.rows);
      
      // Mostrar índices
      const indexesResult = await client.query(`
        SELECT 
          indexname,
          indexdef
        FROM 
          pg_indexes
        WHERE 
          tablename = 'actividades_extracurriculares'
      `);
      
      console.log('\n🔍 Índices creados:');
      console.table(indexesResult.rows);
    }
    
  } catch (error) {
    console.error('❌ Error al crear la tabla:', error);
    console.error('Detalle:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
createTable()
  .then(() => {
    console.log('\n🎉 Proceso completado exitosamente!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
