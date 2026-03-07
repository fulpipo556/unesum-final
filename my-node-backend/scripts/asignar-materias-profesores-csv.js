require('dotenv').config();
const path = require('path');
const xlsx = require('xlsx');
const db = require('../src/models');

const normalizar = (txt) => String(txt || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const splitMaterias = (texto) => {
  if (!texto) return [];
  return String(texto)
    .split(/[;,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

async function main() {
  const csvArg = process.argv[2];
  const csvPath = csvArg
    ? path.resolve(process.cwd(), csvArg)
    : path.resolve(__dirname, '../../../IMPORTAR_SIN_ACENTOS.csv');

  console.log(`📄 Archivo de entrada: ${csvPath}`);

  const workbook = xlsx.readFile(csvPath);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  if (!rows.length) {
    throw new Error('El archivo no contiene filas para procesar.');
  }

  await db.sequelize.authenticate();
  console.log('✅ Conexión a base de datos OK');

  const profesores = await db.Profesor.findAll({
    attributes: ['id', 'nombres', 'apellidos', 'email', 'asignatura_id']
  });
  const asignaturas = await db.Asignatura.findAll({
    attributes: ['id', 'nombre', 'codigo']
  });

  const profesorPorEmail = new Map();
  const profesorPorNombre = new Map();
  profesores.forEach((p) => {
    const emailNorm = normalizar(p.email);
    if (emailNorm) profesorPorEmail.set(emailNorm, p);
    const nombreCompleto = normalizar(`${p.nombres} ${p.apellidos}`);
    if (nombreCompleto) profesorPorNombre.set(nombreCompleto, p);
  });

  const asignaturaIndex = new Map();
  asignaturas.forEach((a) => {
    const byNombre = normalizar(a.nombre);
    const byCodigo = normalizar(a.codigo);
    if (byNombre) asignaturaIndex.set(byNombre, a);
    if (byCodigo) asignaturaIndex.set(byCodigo, a);
  });

  let ok = 0;
  const errores = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;

    const email = r.email || r.Email || r.correo || r.correo_electronico || '';
    const docente = r.Docente || r.docente || r.nombre_docente || r.nombres || '';
    const materiasRaw = r.Asinatura || r.Asignatura || r.asignaturas || r.asignatura || '';

    let profesor = null;
    if (email) profesor = profesorPorEmail.get(normalizar(email)) || null;
    if (!profesor && docente) profesor = profesorPorNombre.get(normalizar(docente)) || null;

    if (!profesor) {
      errores.push(`Fila ${fila}: no se encontró profesor (email: "${email}" / docente: "${docente}")`);
      continue;
    }

    const materias = splitMaterias(materiasRaw);
    if (!materias.length) {
      errores.push(`Fila ${fila}: sin materias para ${profesor.nombres} ${profesor.apellidos}`);
      continue;
    }

    const asignaturaIds = [];
    for (const m of materias) {
      const key = normalizar(m);
      let asig = asignaturaIndex.get(key);

      if (!asig) {
        asig = asignaturas.find((a) => {
          const nombre = normalizar(a.nombre);
          const codigo = normalizar(a.codigo);
          return nombre.includes(key) || key.includes(nombre) || (codigo && (codigo.includes(key) || key.includes(codigo)));
        });
      }

      if (!asig) {
        errores.push(`Fila ${fila}: materia no encontrada "${m}"`);
        continue;
      }

      if (!asignaturaIds.includes(asig.id)) {
        asignaturaIds.push(asig.id);
      }
    }

    if (!asignaturaIds.length) {
      errores.push(`Fila ${fila}: ninguna materia válida para ${profesor.nombres} ${profesor.apellidos}`);
      continue;
    }

    await profesor.update({
      asignatura_id: asignaturaIds[0]
    });

    await profesor.setAsignaturas(asignaturaIds);
    ok++;

    console.log(`✅ ${profesor.nombres} ${profesor.apellidos} -> ${asignaturaIds.length} materia(s)`);
  }

  console.log('\n📊 Resumen');
  console.log(`- Filas procesadas: ${rows.length}`);
  console.log(`- Docentes actualizados: ${ok}`);
  console.log(`- Errores: ${errores.length}`);

  if (errores.length) {
    console.log('\n⚠️ Detalle de errores:');
    errores.forEach((e) => console.log(`  - ${e}`));
  }
}

main()
  .catch((err) => {
    console.error('❌ Error ejecutando carga de materias:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.sequelize.close();
    } catch (_) {}
  });
