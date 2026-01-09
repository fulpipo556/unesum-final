const { sequelize } = require('./src/config/db');
const fs = require('fs');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');
    const sql = fs.readFileSync('./migrations/crear_tablas_usuario_relaciones.sql', 'utf8');
    console.log('📝 Ejecutando migración usuarios...');
    await sequelize.query(sql);
    console.log('✅ Migración de usuarios completada');
  } catch (e) {
    console.error('❌ Error migración usuarios:', e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}
run();