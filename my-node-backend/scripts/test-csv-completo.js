/**
 * Simulación completa del proceso de importación CSV
 */

require('dotenv').config();
const db = require('../src/models');
const xlsx = require('xlsx');
const path = require('path');

async function testImportacion() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Leer el CSV
    const csvPath = path.resolve(__dirname, '../../../IMPORTAR_SIN_ACENTOS.csv');
    console.log('📁 Leyendo archivo:', csvPath);
    
    const workbook = xlsx.readFile(csvPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log('📊 Datos parseados:', data.length, 'filas');
    console.log('🔍 Columnas detectadas:', data[0] ? Object.keys(data[0]) : 'ninguna');
    console.log('🔍 Primera fila:', JSON.stringify(data[0], null, 2));
    console.log('\n');

    // Cargar datos de referencia
    const todasAsignaturas = await db.Asignatura.findAll();
    const todosNiveles = await db.Nivel.findAll();
    const todosParalelos = await db.Paralelo.findAll();
    const todasCarreras = await db.Carrera.findAll();
    
    console.log(`✅ Datos cargados:`);
    console.log(`   - ${todasCarreras.length} carreras`);
    console.log(`   - ${todasAsignaturas.length} asignaturas`);
    console.log(`   - ${todosNiveles.length} niveles`);
    console.log(`   - ${todosParalelos.length} paralelos`);
    console.log('\n');

    // Función para normalizar texto
    const normalizar = (texto) => {
      return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };

    // Procesar SOLO la primera fila
    const fila = data[0];
    console.log('🔄 PROCESANDO FILA 1:', JSON.stringify(fila, null, 2));
    console.log('\n');

    const { Docente, Carrera: carreraNombre, Asinatura, Nivel, Paralelo, Rol } = fila;

    // Validar datos obligatorios
    console.log('📋 VALIDACIÓN DE DATOS OBLIGATORIOS:');
    console.log(`   Docente: ${Docente ? '✅' : '❌'} "${Docente}"`);
    console.log(`   Carrera: ${carreraNombre ? '✅' : '❌'} "${carreraNombre}"`);
    console.log('\n');

    if (!Docente || !carreraNombre) {
      console.error('❌ ERROR: Faltan datos obligatorios (Docente o Carrera)');
      process.exit(1);
    }

    // Extraer nombres y apellidos
    const nombreCompleto = Docente.trim().split(' ');
    const nombres = nombreCompleto.slice(0, -1).join(' ') || nombreCompleto[0];
    const apellidos = nombreCompleto.slice(-1).join(' ') || '';
    
    console.log('👤 DATOS DEL DOCENTE:');
    console.log(`   Nombre completo: "${Docente}"`);
    console.log(`   Nombres: "${nombres}"`);
    console.log(`   Apellidos: "${apellidos}"`);
    console.log('\n');

    // Buscar carrera
    console.log('🔍 BUSCANDO CARRERA:');
    console.log(`   Buscando: "${carreraNombre}"`);
    console.log(`   Normalizado: "${normalizar(carreraNombre)}"`);
    console.log(`\n   Carreras disponibles:`);
    todasCarreras.forEach(c => {
      console.log(`     - ${c.id}: "${c.nombre}" (normalizado: "${normalizar(c.nombre)}")`);
    });

    const carrera = todasCarreras.find(c => {
      const nombreCarreraNorm = normalizar(c.nombre);
      const busquedaNorm = normalizar(carreraNombre.trim());
      const match = nombreCarreraNorm.includes(busquedaNorm) || busquedaNorm.includes(nombreCarreraNorm);
      if (match) {
        console.log(`\n   ✅ MATCH: "${c.nombre}" (ID: ${c.id})`);
      }
      return match;
    });

    if (!carrera) {
      console.error(`\n❌ ERROR: Carrera "${carreraNombre}" no encontrada`);
      process.exit(1);
    }
    
    console.log(`\n✅ Carrera encontrada: ID=${carrera.id}, Nombre="${carrera.nombre}"`);
    console.log('\n');

    // Buscar asignaturas
    console.log('📚 BUSCANDO ASIGNATURAS:');
    console.log(`   Texto original: "${Asinatura}"`);
    
    let asignaturasTexto = Asinatura.trim();
    if (asignaturasTexto.startsWith('(') && asignaturasTexto.endsWith(')')) {
      asignaturasTexto = asignaturasTexto.slice(1, -1);
    }
    const asignaturasNombres = asignaturasTexto.split(',').map(a => a.trim());
    console.log(`   Asignaturas a buscar:`, asignaturasNombres);
    
    const asignaturas = asignaturasNombres.map(nombre => {
      const encontrada = todasAsignaturas.find(asig => {
        const nombreAsigNorm = normalizar(asig.nombre);
        const busquedaNorm = normalizar(nombre);
        return nombreAsigNorm.includes(busquedaNorm) || busquedaNorm.includes(nombreAsigNorm);
      });
      console.log(`     "${nombre}" → ${encontrada ? `✅ ${encontrada.nombre} (ID: ${encontrada.id})` : '❌ No encontrada'}`);
      return encontrada;
    }).filter(Boolean);
    
    console.log(`\n   Total encontradas: ${asignaturas.length}/${asignaturasNombres.length}`);
    console.log('\n');

    // Buscar niveles
    console.log('📊 BUSCANDO NIVELES:');
    console.log(`   Texto original: "${Nivel}"`);
    
    let nivelesTexto = Nivel.trim();
    if (nivelesTexto.startsWith('(') && nivelesTexto.endsWith(')')) {
      nivelesTexto = nivelesTexto.slice(1, -1);
    }
    const nivelesNombres = nivelesTexto.split(',').map(n => n.trim());
    console.log(`   Niveles a buscar:`, nivelesNombres);
    
    const niveles = nivelesNombres.map(nombre => {
      const encontrado = todosNiveles.find(niv => {
        const nombreNivNorm = normalizar(niv.nombre);
        const busquedaNorm = normalizar(nombre);
        return nombreNivNorm.includes(busquedaNorm) || busquedaNorm.includes(nombreNivNorm);
      });
      console.log(`     "${nombre}" → ${encontrado ? `✅ ${encontrado.nombre} (ID: ${encontrado.id})` : '❌ No encontrado'}`);
      return encontrado;
    }).filter(Boolean);
    
    console.log(`\n   Total encontrados: ${niveles.length}/${nivelesNombres.length}`);
    console.log('\n');

    // Validaciones finales
    console.log('✔️ VALIDACIONES FINALES:');
    console.log(`   Asignaturas encontradas: ${asignaturas.length > 0 ? '✅' : '❌'}`);
    console.log(`   Niveles encontrados: ${niveles.length > 0 ? '✅' : '❌'}`);
    console.log(`   Cantidad coincide: ${asignaturas.length === niveles.length ? '✅' : '❌'}`);
    
    if (asignaturas.length === 0 || niveles.length === 0) {
      console.error('\n❌ ERROR: Debe especificar al menos una asignatura y un nivel válidos');
      process.exit(1);
    }

    if (asignaturas.length !== niveles.length) {
      console.error(`\n❌ ERROR: Cantidad de asignaturas (${asignaturas.length}) no coincide con niveles (${niveles.length})`);
      process.exit(1);
    }

    console.log('\n\n🎉 TODAS LAS VALIDACIONES PASARON');
    console.log('\n📝 DATOS FINALES PARA CREAR PROFESOR:');
    console.log({
      nombres,
      apellidos,
      carrera_id: carrera.id,
      asignatura_id: asignaturas[0].id,
      nivel_id: niveles[0].id
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error(error.stack);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

testImportacion();
