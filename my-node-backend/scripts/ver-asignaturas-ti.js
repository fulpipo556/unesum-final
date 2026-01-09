require('dotenv').config();
const db = require('../src/models');

(async () => {
  await db.sequelize.authenticate();
  const asigs = await db.Asignatura.findAll({ 
    where: { carrera_id: 10 }, 
    order: [['nombre', 'ASC']] 
  });
  
  console.log('\n📚 Asignaturas de Tecnologías de la Información:\n');
  asigs.forEach(a => console.log(`  ID ${a.id}: ${a.nombre} (${a.codigo})`));
  console.log(`\n Total: ${asigs.length} asignaturas\n`);
  
  await db.sequelize.close();
  process.exit();
})();
