/**
 * Script para probar la importación CSV directamente
 * Ejecutar: node scripts/test-importacion.js
 */

require('dotenv').config();
const db = require('../src/models');
const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

async function testImportacion() {
  console.log('\n🧪 ========== TEST DE IMPORTACIÓN CSV ==========\n');
  
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conexión exitosa a la base de datos\n');

    // Leer el archivo CSV
    const csvPath = path.join(__dirname, '..', '..', 'IMPORTAR_PROFESORES_UTF8.csv');
    console.log('📂 Leyendo archivo:', csvPath);
    
    if (!fs.existsSync(csvPath)) {
      console.log('❌ El archivo no existe:', csvPath);
      process.exit(1);
    }

    const workbook = xlsx.readFile(csvPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log('📊 Datos parseados:', data.length, 'filas');
    console.log('🔍 Columnas:', Object.keys(data[0]));
    console.log('🔍 Primera fila:', JSON.stringify(data[0], null, 2));
    console.log('');

    // Verificar referencias
    console.log('🔍 Verificando datos de referencia...\n');
    
    const todasCarreras = await db.Carrera.findAll();
    const todasAsignaturas = await db.Asignatura.findAll();
    const todosNiveles = await db.Nivel.findAll();
    const todosParalelos = await db.Paralelo.findAll();

    console.log(`   📁 Carreras: ${todasCarreras.length}`);
    console.log(`   📚 Asignaturas: ${todasAsignaturas.length}`);
    console.log(`   📊 Niveles: ${todosNiveles.length}`);
    console.log(`   🔤 Paralelos: ${todosParalelos.length}`);
    console.log('');

    // Procesar primera fila como prueba
    const primeraFila = data[0];
    console.log('🔄 Procesando primera fila:\n');
    
    const { Docente, Carrera: carreraNombre, Asinatura, Nivel, Paralelo } = primeraFila;
    
    console.log(`   👤 Docente: "${Docente}"`);
    console.log(`   🏢 Carrera buscada: "${carreraNombre}"`);
    
    const carrera = todasCarreras.find(c => 
      c.nombre.toLowerCase().includes(carreraNombre.toLowerCase().trim())
    );
    console.log(`   ${carrera ? '✅' : '❌'} Carrera encontrada: ${carrera ? carrera.nombre : 'NO ENCONTRADA'}`);

    if (Asinatura) {
      let asignaturasTexto = Asinatura.trim();
      if (asignaturasTexto.startsWith('(') && asignaturasTexto.endsWith(')')) {
        asignaturasTexto = asignaturasTexto.slice(1, -1);
      }
      const asignaturasNombres = asignaturasTexto.split(',').map(a => a.trim());
      console.log(`   📚 Asignaturas buscadas: ${asignaturasNombres.join(', ')}`);
      
      asignaturasNombres.forEach(nombre => {
        const asig = todasAsignaturas.find(a => 
          a.nombre.toLowerCase().includes(nombre.toLowerCase()) ||
          nombre.toLowerCase().includes(a.nombre.toLowerCase())
        );
        console.log(`      ${asig ? '✅' : '❌'} "${nombre}" → ${asig ? asig.nombre : 'NO ENCONTRADA'}`);
      });
    }

    if (Nivel) {
      let nivelesTexto = Nivel.trim();
      if (nivelesTexto.startsWith('(') && nivelesTexto.endsWith(')')) {
        nivelesTexto = nivelesTexto.slice(1, -1);
      }
      const nivelesNombres = nivelesTexto.split(',').map(n => n.trim());
      console.log(`   📊 Niveles buscados: ${nivelesNombres.join(', ')}`);
      
      nivelesNombres.forEach(nombre => {
        const niv = todosNiveles.find(n => 
          n.nombre.toLowerCase().includes(nombre.toLowerCase()) ||
          nombre.toLowerCase().includes(n.nombre.toLowerCase())
        );
        console.log(`      ${niv ? '✅' : '❌'} "${nombre}" → ${niv ? niv.nombre : 'NO ENCONTRADO'}`);
      });
    }

    console.log('\n========== FIN DEL TEST ==========\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

testImportacion();
