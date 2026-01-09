const { sequelize } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function runSeed() {
  try {
    console.log('🌱 Iniciando seed de datos...');
    
    // Autenticar conexión
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');
    
    // Leer archivo SQL de seed
    const seedPath = path.join(__dirname, 'migrations', 'seed_datos_iniciales.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    console.log('📝 Ejecutando seed de datos iniciales...');
    await sequelize.query(seedSQL);
    console.log('✅ Seed completado exitosamente');
    
    // Verificar datos
    console.log('\n📊 Resumen de datos:');
    const [roles] = await sequelize.query('SELECT COUNT(*) as count FROM roles');
    console.log(`   - Roles: ${roles[0].count}`);
    
    const [facultades] = await sequelize.query('SELECT COUNT(*) as count FROM facultades');
    console.log(`   - Facultades: ${facultades[0].count}`);
    
    const [carreras] = await sequelize.query('SELECT COUNT(*) as count FROM carreras');
    console.log(`   - Carreras: ${carreras[0].count}`);
    
    const [niveles] = await sequelize.query('SELECT COUNT(*) as count FROM nivel');
    console.log(`   - Niveles: ${niveles[0].count}`);
    
    const [asignaturas] = await sequelize.query('SELECT COUNT(*) as count FROM asignaturas');
    console.log(`   - Asignaturas: ${asignaturas[0].count}`);
    
    console.log('\n🎉 ¡Seed completado! La base de datos tiene datos iniciales.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando seed:', error.message);
    process.exit(1);
  }
}

runSeed();
