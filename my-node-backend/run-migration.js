// Script para ejecutar migración de columnas
const { sequelize } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    const sqlPath = path.join(__dirname, 'migrations', 'agregar_columnas_profesores.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Ejecutando migración...');
    await sequelize.query(sql);
    
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

runMigration();
