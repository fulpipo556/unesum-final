require('dotenv').config();
const db = require('../src/models');

(async () => {
  await db.sequelize.authenticate();
  
  // List all tables
  const allTables = await db.sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  console.log('=== ALL TABLES ===');
  allTables.forEach(t => console.log('  ', JSON.stringify(t)));
  
  // Check syllabi
  console.log('\n=== SYLLABI ===');
  const syllabi = await db.sequelize.query(
    'SELECT id, nombre, periodo, asignatura_id, profesor_id, "createdAt" FROM syllabi ORDER BY id',
    { type: db.sequelize.QueryTypes.SELECT }
  );
  syllabi.forEach(s => console.log(JSON.stringify(s)));
  
  // Check syllabus_comision_academica
  console.log('\n=== SYLLABUS_COMISION_ACADEMICA ===');
  const syllabusComision = await db.sequelize.query(
    'SELECT id, nombre, periodo, asignatura_id, estado, created_at FROM syllabus_comision_academica ORDER BY id',
    { type: db.sequelize.QueryTypes.SELECT }
  );
  syllabusComision.forEach(s => console.log(JSON.stringify(s)));
  
  // Check for programa tables - try different names
  const progTables = allTables.filter(t => t.table_name.includes('programa'));
  console.log('\n=== PROGRAMA TABLES ===');
  for (const t of progTables) {
    const cols = await db.sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${t.table_name}' ORDER BY ordinal_position`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    console.log(`${t.table_name}: ${cols.map(c => c.column_name).join(', ')}`);
    
    // Get row count and sample data
    const rows = await db.sequelize.query(
      `SELECT * FROM ${t.table_name} LIMIT 5`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    console.log(`  Rows: ${rows.length}`);
    rows.forEach(r => {
      // Print without large JSON fields
      const summary = {};
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === 'string' && v.length > 200) {
          summary[k] = v.substring(0, 100) + '...';
        } else if (typeof v === 'object' && v !== null) {
          summary[k] = '[object]';
        } else {
          summary[k] = v;
        }
      }
      console.log('  ', JSON.stringify(summary));
    });
  }
  
  // Check asignaturas that have Programación in their name
  console.log('\n=== ASIGNATURAS PROGRAMACION ===');
  const asigs = await db.sequelize.query(
    "SELECT id, nombre, codigo, nivel, semestre, carrera_id FROM asignaturas WHERE nombre ILIKE '%programaci%' OR nombre ILIKE '%programac%' ORDER BY id",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  asigs.forEach(a => console.log(JSON.stringify(a)));
  
  // All asignaturas
  console.log('\n=== TODAS LAS ASIGNATURAS ===');
  const allAsigs = await db.sequelize.query(
    "SELECT id, nombre, codigo, nivel, semestre, carrera_id FROM asignaturas ORDER BY id",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  allAsigs.forEach(a => console.log(JSON.stringify(a)));
  
  process.exit(0);
})();
