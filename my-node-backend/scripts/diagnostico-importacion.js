/**
 * Script de diagnóstico para importación CSV de profesores
 * Ejecutar: node scripts/diagnostico-importacion.js
 */

require('dotenv').config();
const db = require('../src/models');

async function diagnostico() {
  console.log('\n🔍 ========== DIAGNÓSTICO DE IMPORTACIÓN CSV ==========\n');
  
  try {
    // 1. Verificar conexión a la BD
    console.log('1️⃣ Verificando conexión a la base de datos...');
    await db.sequelize.authenticate();
    console.log('   ✅ Conexión exitosa\n');

    // 2. Verificar tablas de referencia
    console.log('2️⃣ Verificando tablas de referencia...\n');

    // Carreras
    const carreras = await db.Carrera.findAll({ raw: true });
    console.log(`   📁 CARRERAS (${carreras.length} registros):`);
    if (carreras.length === 0) {
      console.log('   ❌ NO HAY CARRERAS - Debes crear carreras primero');
    } else {
      carreras.forEach(c => console.log(`      - ID ${c.id}: "${c.nombre}"`));
    }
    console.log('');

    // Asignaturas
    const asignaturas = await db.Asignatura.findAll({ raw: true });
    console.log(`   📚 ASIGNATURAS (${asignaturas.length} registros):`);
    if (asignaturas.length === 0) {
      console.log('   ❌ NO HAY ASIGNATURAS - Debes crear asignaturas primero');
    } else {
      asignaturas.slice(0, 10).forEach(a => console.log(`      - ID ${a.id}: "${a.nombre}" (código: ${a.codigo})`));
      if (asignaturas.length > 10) console.log(`      ... y ${asignaturas.length - 10} más`);
    }
    console.log('');

    // Niveles
    const niveles = await db.Nivel.findAll({ raw: true });
    console.log(`   📊 NIVELES (${niveles.length} registros):`);
    if (niveles.length === 0) {
      console.log('   ❌ NO HAY NIVELES - Debes crear niveles primero');
    } else {
      niveles.forEach(n => console.log(`      - ID ${n.id}: "${n.nombre}" (código: ${n.codigo})`));
    }
    console.log('');

    // Paralelos
    const paralelos = await db.Paralelo.findAll({ raw: true });
    console.log(`   🔤 PARALELOS (${paralelos.length} registros):`);
    if (paralelos.length === 0) {
      console.log('   ❌ NO HAY PARALELOS - Debes crear paralelos primero');
    } else {
      paralelos.forEach(p => console.log(`      - ID ${p.id}: "${p.nombre}" (código: ${p.codigo})`));
    }
    console.log('');

    // Profesores existentes
    const profesores = await db.Profesor.findAll({ raw: true });
    console.log(`   👨‍🏫 PROFESORES (${profesores.length} registros):`);
    if (profesores.length === 0) {
      console.log('   ℹ️  No hay profesores aún - Esto es normal si no has importado');
    } else {
      profesores.slice(0, 5).forEach(p => console.log(`      - ID ${p.id}: "${p.nombres} ${p.apellidos}" (${p.email})`));
      if (profesores.length > 5) console.log(`      ... y ${profesores.length - 5} más`);
    }
    console.log('');

    // 3. Simular búsquedas como lo hace el CSV
    console.log('3️⃣ Simulando búsquedas del CSV...\n');
    
    // Buscar "Tecnologías de la Información"
    const carreraBusqueda = 'Tecnologías de la Información';
    const carreraEncontrada = carreras.find(c => 
      c.nombre.toLowerCase().includes(carreraBusqueda.toLowerCase())
    );
    console.log(`   🔍 Buscando carrera "${carreraBusqueda}":`);
    console.log(`      ${carreraEncontrada ? `✅ Encontrada: "${carreraEncontrada.nombre}"` : '❌ NO ENCONTRADA'}`);
    console.log('');

    // Buscar "Programación I"
    const asigBusqueda = 'Programación I';
    const asigEncontrada = asignaturas.find(a => 
      a.nombre.toLowerCase().includes(asigBusqueda.toLowerCase()) ||
      asigBusqueda.toLowerCase().includes(a.nombre.toLowerCase())
    );
    console.log(`   🔍 Buscando asignatura "${asigBusqueda}":`);
    console.log(`      ${asigEncontrada ? `✅ Encontrada: "${asigEncontrada.nombre}"` : '❌ NO ENCONTRADA'}`);
    console.log('');

    // Buscar "Segundo"
    const nivelBusqueda = 'Segundo';
    const nivelEncontrado = niveles.find(n => 
      n.nombre.toLowerCase().includes(nivelBusqueda.toLowerCase()) ||
      nivelBusqueda.toLowerCase().includes(n.nombre.toLowerCase())
    );
    console.log(`   🔍 Buscando nivel "${nivelBusqueda}":`);
    console.log(`      ${nivelEncontrado ? `✅ Encontrado: "${nivelEncontrado.nombre}"` : '❌ NO ENCONTRADO'}`);
    console.log('');

    // Buscar paralelo "A"
    const paraleloBusqueda = 'A';
    const paraleloEncontrado = paralelos.find(p => 
      p.nombre.toLowerCase() === paraleloBusqueda.toLowerCase() ||
      (p.codigo && p.codigo.toLowerCase() === paraleloBusqueda.toLowerCase())
    );
    console.log(`   🔍 Buscando paralelo "${paraleloBusqueda}":`);
    console.log(`      ${paraleloEncontrado ? `✅ Encontrado: "${paraleloEncontrado.nombre}"` : '❌ NO ENCONTRADO'}`);
    console.log('');

    // 4. Resumen
    console.log('4️⃣ RESUMEN Y RECOMENDACIONES:\n');
    
    const problemas = [];
    if (carreras.length === 0) problemas.push('- Crear carreras en Admin → Datos Académicos → Carreras');
    if (asignaturas.length === 0) problemas.push('- Crear asignaturas en Admin → Asignaturas');
    if (niveles.length === 0) problemas.push('- Crear niveles en Admin → Datos Académicos → Niveles');
    if (paralelos.length === 0) problemas.push('- Crear paralelos en Admin → Datos Académicos → Paralelos');
    if (!carreraEncontrada && carreras.length > 0) problemas.push('- La carrera "Tecnologías de la Información" no existe. Usa el nombre exacto de una carrera existente.');
    if (!asigEncontrada && asignaturas.length > 0) problemas.push('- La asignatura "Programación I" no existe. Usa el nombre exacto de una asignatura existente.');
    if (!nivelEncontrado && niveles.length > 0) problemas.push('- El nivel "Segundo" no existe. Usa el nombre exacto de un nivel existente.');
    if (!paraleloEncontrado && paralelos.length > 0) problemas.push('- El paralelo "A" no existe. Usa el nombre exacto de un paralelo existente.');

    if (problemas.length === 0) {
      console.log('   ✅ Todo parece correcto para la importación.');
      console.log('   📄 Usa este formato en tu CSV:\n');
      console.log('   Docente,Carrera,Asinatura,Nivel,Paralelo,Rol');
      console.log(`   Fulco Pincay,${carreraEncontrada?.nombre || 'NombreCarrera'},"${asigEncontrada?.nombre || 'NombreAsignatura'}","${nivelEncontrado?.nombre || 'NombreNivel'}","(${paraleloEncontrado?.nombre || 'A'})",Docente`);
    } else {
      console.log('   ❌ PROBLEMAS ENCONTRADOS:\n');
      problemas.forEach(p => console.log(`   ${p}`));
    }

    console.log('\n========== FIN DEL DIAGNÓSTICO ==========\n');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

diagnostico();
