require('dotenv').config();
const db = require('./src/models');

(async () => {
  await db.sequelize.authenticate();
  const [rows] = await db.sequelize.query(`
    SELECT p.id, p.nombres, p.apellidos, p.email, p.asignatura_id, 
           a.nombre as asig_nombre, pa.asignatura_id as pa_asig_id
    FROM profesores p 
    LEFT JOIN asignaturas a ON p.asignatura_id::int = a.id 
    LEFT JOIN profesor_asignaturas pa ON pa.profesor_id = p.id 
    WHERE p."deletedAt" IS NULL 
    ORDER BY p.id
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})();
