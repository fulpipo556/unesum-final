require('dotenv').config();
const db = require('../src/models');

(async () => {
  await db.sequelize.authenticate();
  
  // Check programas_analiticos  
  console.log('\n=== PROGRAMAS_ANALITICOS ===');
  const progCols = await db.sequelize.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'programas_analiticos' ORDER BY ordinal_position",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  console.log('Columns:', progCols.map(c => c.column_name).join(', '));
  
  const progs = await db.sequelize.query('SELECT * FROM programas_analiticos LIMIT 10', { type: db.sequelize.QueryTypes.SELECT });
  console.log('Rows:', progs.length);
  progs.forEach(p => {
    const s = {};
    for (const [k,v] of Object.entries(p)) {
      if (typeof v === 'string' && v.length > 150) s[k] = v.substring(0,100)+'...';
      else if (v && typeof v === 'object' && !Array.isArray(v)) s[k] = '{obj}';
      else s[k] = v;
    }
    console.log(' ', JSON.stringify(s));
  });
  
  // Check programa_analitico_docente
  console.log('\n=== PROGRAMA_ANALITICO_DOCENTE ===');
  const pdCols = await db.sequelize.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'programa_analitico_docente' ORDER BY ordinal_position",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  console.log('Columns:', pdCols.map(c => c.column_name).join(', '));
  
  const pdRows = await db.sequelize.query('SELECT * FROM programa_analitico_docente LIMIT 10', { type: db.sequelize.QueryTypes.SELECT });
  console.log('Rows:', pdRows.length);
  pdRows.forEach(p => {
    const s = {};
    for (const [k,v] of Object.entries(p)) {
      if (typeof v === 'string' && v.length > 150) s[k] = v.substring(0,100)+'...';
      else if (v && typeof v === 'object' && !Array.isArray(v)) s[k] = '{obj}';
      else s[k] = v;
    }
    console.log(' ', JSON.stringify(s));
  });
  
  // Check syllabus_docente
  console.log('\n=== SYLLABUS_DOCENTE ===');
  const sdCols = await db.sequelize.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'syllabus_docente' ORDER BY ordinal_position",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  console.log('Columns:', sdCols.map(c => c.column_name).join(', '));
  
  const sdRows = await db.sequelize.query('SELECT * FROM syllabus_docente LIMIT 10', { type: db.sequelize.QueryTypes.SELECT });
  console.log('Rows:', sdRows.length);
  sdRows.forEach(p => {
    const s = {};
    for (const [k,v] of Object.entries(p)) {
      if (typeof v === 'string' && v.length > 150) s[k] = v.substring(0,100)+'...';
      else s[k] = v;
    }
    console.log(' ', JSON.stringify(s));
  });
  
  // Asignaturas con Programación
  console.log('\n=== ASIGNATURAS PROGRAMACION ===');
  const asigs = await db.sequelize.query(
    "SELECT id, nombre, codigo, nivel, semestre, carrera_id FROM asignaturas WHERE nombre ILIKE '%programaci%' ORDER BY id",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  asigs.forEach(a => console.log(' ', JSON.stringify(a)));
  
  // All asignaturas for this carrera
  console.log('\n=== TODAS ASIGNATURAS ===');
  const all = await db.sequelize.query(
    "SELECT id, nombre, codigo, nivel, semestre, carrera_id FROM asignaturas ORDER BY carrera_id, nivel, id",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  all.forEach(a => console.log(' ', JSON.stringify(a)));
  
  // contenido_programa
  console.log('\n=== CONTENIDO_PROGRAMA ===');
  const cpCols = await db.sequelize.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'contenido_programa' ORDER BY ordinal_position",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  console.log('Columns:', cpCols.map(c => c.column_name).join(', '));
  const cpRows = await db.sequelize.query('SELECT COUNT(*) as cnt FROM contenido_programa', { type: db.sequelize.QueryTypes.SELECT });
  console.log('Count:', cpRows[0].cnt);
  
  // plantillas_programa 
  console.log('\n=== PLANTILLAS_PROGRAMA ===');
  const ppCols = await db.sequelize.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'plantillas_programa' ORDER BY ordinal_position",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  console.log('Columns:', ppCols.map(c => c.column_name).join(', '));
  const ppRows = await db.sequelize.query('SELECT * FROM plantillas_programa LIMIT 5', { type: db.sequelize.QueryTypes.SELECT });
  console.log('Rows:', ppRows.length);
  ppRows.forEach(p => {
    const s = {};
    for (const [k,v] of Object.entries(p)) {
      if (typeof v === 'string' && v.length > 150) s[k] = v.substring(0,100)+'...';
      else s[k] = v;
    }
    console.log(' ', JSON.stringify(s));
  });

  process.exit(0);
})();
