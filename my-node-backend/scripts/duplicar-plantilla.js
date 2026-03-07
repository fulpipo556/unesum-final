/**
 * Script para duplicar el programa analítico y syllabus de Programación II
 * como plantilla para TODAS las asignaturas de la carrera TI (carrera_id=10).
 */
require('dotenv').config();
const db = require('../src/models');

const TEMPLATE_PROG_ID = 47;    // programas_analiticos id
const TEMPLATE_SYLL_ID = 3;     // syllabus_comision_academica id
const TEMPLATE_ASIG_ID = '31';  // Programación II
const CARRERA_ID = 10;
const PERIODO = 'Primer Periodo PII 2026';
const PERIODO_SYLL = '11';

// Map nivel_id to nombre for replacement in templates
const NIVEL_MAP = {
  '2': 'Primero',
  '3': 'Segundo',
  '6': 'Tercero',
  '7': 'Cuarto',
  '8': 'Quinto',
  '9': 'Sexto',
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Replace asignatura-specific text in the datos_tabla JSON structure
 */
function replaceProgramaFields(datosTabla, asignatura) {
  const data = deepClone(datosTabla);
  const nivelNombre = NIVEL_MAP[asignatura.nivel_id] || asignatura.nivel_nombre || '';

  if (data.tabs) {
    for (const tab of data.tabs) {
      if (!tab.rows) continue;
      for (const row of tab.rows) {
        if (!row.cells) continue;
        for (let i = 0; i < row.cells.length; i++) {
          const cell = row.cells[i];
          const content = (cell.content || '').trim().toUpperCase();

          // Replace ASIGNATURA field value (cell to the right of "ASIGNATURA")
          if (content === 'ASIGNATURA' && i + 1 < row.cells.length) {
            // Don't modify the label, modify the next cell (value)
            // But if the value is in the same row, we check
          }

          // Replace Programación II references with new asignatura name
          if (cell.content && cell.content.includes('Programación II')) {
            cell.content = cell.content.replace(/Programación II/g, asignatura.nombre);
          }
          if (cell.content && cell.content.includes('programación II')) {
            cell.content = cell.content.replace(/programación II/g, asignatura.nombre);
          }
          if (cell.content && cell.content.includes('PROGRAMACIÓN II')) {
            cell.content = cell.content.replace(/PROGRAMACIÓN II/g, asignatura.nombre.toUpperCase());
          }
          if (cell.content && cell.content.includes('TI-301')) {
            cell.content = cell.content.replace(/TI-301/g, asignatura.codigo);
          }
        }
      }

      // Special: Find ASIGNATURA label and replace the value cell
      for (const row of tab.rows) {
        if (!row.cells) continue;
        for (let i = 0; i < row.cells.length; i++) {
          const cell = row.cells[i];
          const upper = (cell.content || '').trim().toUpperCase();
          
          // If this cell is a label and next cell is value
          if (upper === 'ASIGNATURA' && i + 1 < row.cells.length) {
            row.cells[i + 1].content = asignatura.nombre;
          }
          if (upper === 'NIVEL' && i + 1 < row.cells.length) {
            row.cells[i + 1].content = nivelNombre;
          }
          if ((upper === 'CODIGO' || upper === 'CÓDIGO') && i + 1 < row.cells.length) {
            row.cells[i + 1].content = asignatura.codigo;
          }
        }
      }
    }
  }
  return data;
}

/**
 * Replace asignatura-specific text in the syllabus datos_syllabus JSON
 */
function replaceSyllabusFields(datosSyllabus, asignatura) {
  const data = deepClone(datosSyllabus);
  const nivelNombre = NIVEL_MAP[asignatura.nivel_id] || asignatura.nivel_nombre || '';

  if (data.tabs) {
    for (const tab of data.tabs) {
      if (!tab.rows) continue;
      for (const row of tab.rows) {
        if (!row.cells) continue;
        for (let i = 0; i < row.cells.length; i++) {
          const cell = row.cells[i];
          
          // Replace Programación II references
          if (cell.content && cell.content.includes('Programación II')) {
            cell.content = cell.content.replace(/Programación II/g, asignatura.nombre);
          }
          if (cell.content && cell.content.includes('TI-301')) {
            cell.content = cell.content.replace(/TI-301/g, asignatura.codigo);
          }
        }
      }

      // Find and replace specific label-value pairs
      for (const row of tab.rows) {
        if (!row.cells) continue;
        for (let i = 0; i < row.cells.length; i++) {
          const cell = row.cells[i];
          const upper = (cell.content || '').trim().toUpperCase();
          
          if (upper === 'ASIGNATURA' && i + 1 < row.cells.length) {
            row.cells[i + 1].content = asignatura.nombre;
          }
          if (upper === 'NIVEL' && i + 1 < row.cells.length) {
            row.cells[i + 1].content = nivelNombre;
          }
          if ((upper === 'CODIGO' || upper === 'CÓDIGO') && i + 1 < row.cells.length) {
            row.cells[i + 1].content = asignatura.codigo;
          }
        }
      }
    }
  }
  return data;
}

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Connected to database.');

    // 1. Get template programa
    const [templateProg] = await db.sequelize.query(
      'SELECT * FROM programas_analiticos WHERE id = $1',
      { bind: [TEMPLATE_PROG_ID], type: db.sequelize.QueryTypes.SELECT }
    );
    if (!templateProg) {
      console.error('Template programa not found!');
      process.exit(1);
    }
    console.log('Template programa loaded (id=' + templateProg.id + ')');

    // 2. Get template syllabus
    const [templateSyll] = await db.sequelize.query(
      'SELECT * FROM syllabus_comision_academica WHERE id = $1',
      { bind: [TEMPLATE_SYLL_ID], type: db.sequelize.QueryTypes.SELECT }
    );
    if (!templateSyll) {
      console.error('Template syllabus not found!');
      process.exit(1);
    }
    console.log('Template syllabus loaded (id=' + templateSyll.id + ')');

    // 3. Get all asignaturas for TI carrera
    const asignaturas = await db.sequelize.query(
      `SELECT a.id, a.nombre, a.codigo, a.nivel_id, n.nombre as nivel_nombre 
       FROM asignaturas a 
       LEFT JOIN nivel n ON a.nivel_id::int = n.id 
       WHERE a.carrera_id = $1 
       ORDER BY a.nivel_id::int, a.id`,
      { bind: [CARRERA_ID], type: db.sequelize.QueryTypes.SELECT }
    );
    console.log('Total asignaturas:', asignaturas.length);

    // 4. Get existing programas and syllabi to avoid duplicates
    const existingProgs = await db.sequelize.query(
      'SELECT asignatura_id FROM programas_analiticos WHERE asignatura_id IS NOT NULL',
      { type: db.sequelize.QueryTypes.SELECT }
    );
    const existingProgIds = new Set(existingProgs.map(p => String(p.asignatura_id)));

    const existingSylls = await db.sequelize.query(
      'SELECT asignatura_id FROM syllabus_comision_academica WHERE asignatura_id IS NOT NULL',
      { type: db.sequelize.QueryTypes.SELECT }
    );
    const existingSyllIds = new Set(existingSylls.map(s => String(s.asignatura_id)));

    let progCreated = 0;
    let syllCreated = 0;
    let skipped = 0;

    for (const asig of asignaturas) {
      const asigId = String(asig.id);
      console.log(`\nProcessing: ${asig.nombre} (${asig.codigo}, id=${asig.id})`);

      // Create programa if doesn't exist
      if (!existingProgIds.has(asigId)) {
        const newDatosTabla = replaceProgramaFields(templateProg.datos_tabla, asig);
        
        await db.sequelize.query(
          `INSERT INTO programas_analiticos (nombre, datos_tabla, usuario_id, "createdAt", "updatedAt", periodo, asignatura_id) 
           VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)`,
          {
            bind: [
              'ProgramaAnalitico',
              JSON.stringify(newDatosTabla),
              templateProg.usuario_id,
              PERIODO,
              asig.id
            ]
          }
        );
        console.log(`  ✓ Programa analítico creado`);
        progCreated++;
      } else {
        console.log(`  - Programa ya existe, saltando`);
        skipped++;
      }

      // Create syllabus if doesn't exist  
      if (!existingSyllIds.has(asigId)) {
        const syllData = typeof templateSyll.datos_syllabus === 'string' 
          ? JSON.parse(templateSyll.datos_syllabus) 
          : templateSyll.datos_syllabus;
        const newDatosSyllabus = replaceSyllabusFields(syllData, asig);
        
        // Also handle datos_json if present
        let newDatosJson = null;
        if (templateSyll.datos_json) {
          const djData = typeof templateSyll.datos_json === 'string' 
            ? JSON.parse(templateSyll.datos_json) 
            : templateSyll.datos_json;
          newDatosJson = replaceSyllabusFields(djData, asig);
        }

        await db.sequelize.query(
          `INSERT INTO syllabus_comision_academica 
           (nombre, periodo, asignatura_id, estado, created_at, updated_at, datos_syllabus, datos_json, usuario_id, nombre_archivo, periodo_academico) 
           VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7, $8, $9)`,
          {
            bind: [
              'Syllabus de ' + asig.nombre,
              PERIODO_SYLL,
              asig.id,
              'activo',
              JSON.stringify(newDatosSyllabus),
              newDatosJson ? JSON.stringify(newDatosJson) : null,
              templateSyll.usuario_id,
              'Syllabus ' + asig.codigo + '.docx',
              templateSyll.periodo_academico
            ]
          }
        );
        console.log(`  ✓ Syllabus creado`);
        syllCreated++;
      } else {
        console.log(`  - Syllabus ya existe, saltando`);
        skipped++;
      }
    }

    console.log('\n========== RESUMEN ==========');
    console.log(`Programas creados: ${progCreated}`);
    console.log(`Syllabi creados: ${syllCreated}`);
    console.log(`Saltados (ya existían): ${skipped}`);
    console.log('LISTO!');

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
