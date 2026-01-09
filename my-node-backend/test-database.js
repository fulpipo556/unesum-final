const { sequelize } = require('./src/config/db');
const db = require('./src/models');

async function testEndpoints() {
  try {
    console.log('🔍 Probando conexión a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');
    
    // Probar cada modelo
    console.log('📊 Contando registros en cada tabla:');
    
    const [roles] = await sequelize.query('SELECT COUNT(*) as count FROM roles');
    console.log(`   Roles: ${roles[0].count}`);
    
    const [facultades] = await sequelize.query('SELECT COUNT(*) as count FROM facultades');
    console.log(`   Facultades: ${facultades[0].count}`);
    
    const [carreras] = await sequelize.query('SELECT COUNT(*) as count FROM carreras');
    console.log(`   Carreras: ${carreras[0].count}`);
    
    const [niveles] = await sequelize.query('SELECT COUNT(*) as count FROM nivel');
    console.log(`   Niveles: ${niveles[0].count}`);
    
    const [asignaturas] = await sequelize.query('SELECT COUNT(*) as count FROM asignaturas');
    console.log(`   Asignaturas: ${asignaturas[0].count}`);
    
    const [usuarios] = await sequelize.query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`   Usuarios: ${usuarios[0].count}`);
    
    console.log('\n🧪 Probando modelos de Sequelize:');
    
    try {
      const rolesData = await db.Rol.findAll({ limit: 2 });
      console.log(`   ✅ Rol model OK - Encontrados ${rolesData.length} roles`);
    } catch (e) {
      console.log(`   ❌ Rol model ERROR: ${e.message}`);
    }
    
    try {
      const facultadesData = await db.Facultad.findAll({ limit: 2 });
      console.log(`   ✅ Facultad model OK - Encontradas ${facultadesData.length} facultades`);
    } catch (e) {
      console.log(`   ❌ Facultad model ERROR: ${e.message}`);
    }
    
    try {
      const carrerasData = await db.Carrera.findAll({ limit: 2 });
      console.log(`   ✅ Carrera model OK - Encontradas ${carrerasData.length} carreras`);
    } catch (e) {
      console.log(`   ❌ Carrera model ERROR: ${e.message}`);
    }
    
    try {
      const nivelesData = await db.Nivel.findAll({ limit: 2 });
      console.log(`   ✅ Nivel model OK - Encontrados ${nivelesData.length} niveles`);
    } catch (e) {
      console.log(`   ❌ Nivel model ERROR: ${e.message}`);
    }
    
    try {
      const asignaturasData = await db.Asignatura.findAll({ limit: 2 });
      console.log(`   ✅ Asignatura model OK - Encontradas ${asignaturasData.length} asignaturas`);
    } catch (e) {
      console.log(`   ❌ Asignatura model ERROR: ${e.message}`);
    }
    
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEndpoints();
