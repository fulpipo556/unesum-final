const { sequelize } = require('./src/config/db');
const fs = require('fs');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');
    
    // Ejecutar migración de tablas pivot originales
    const sql1 = fs.readFileSync('./migrations/crear_tablas_usuario_relaciones.sql', 'utf8');
    console.log('📝 Ejecutando migración usuarios (roles, facultades, carreras)...');
    await sequelize.query(sql1);
    console.log('✅ Migración 1 completada');
    
    // Ejecutar migración de niveles y asignaturas
    const sql2 = fs.readFileSync('./migrations/crear_tablas_usuario_niveles_asignaturas.sql', 'utf8');
    console.log('📝 Ejecutando migración usuarios (niveles, asignaturas)...');
    await sequelize.query(sql2);
    console.log('✅ Migración 2 completada');
    
    console.log('🎉 Todas las migraciones completadas exitosamente');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}
run();
