/**
 * Script para ver la estructura de la tabla profesores
 */

require('dotenv').config();
const db = require('../src/models');

async function verEstructuraTabla() {
  try {
    await db.sequelize.authenticate();
    
    const resultado = await db.sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_name = 'profesores' 
      ORDER BY ordinal_position;
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    console.log('\n📊 ESTRUCTURA TABLA PROFESORES:\n');
    console.table(resultado);
    
    // Ver constraints
    const constraints = await db.sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'profesores';
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    console.log('\n🔗 CONSTRAINTS:\n');
    console.table(constraints);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

verEstructuraTabla();
