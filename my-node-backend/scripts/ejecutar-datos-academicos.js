/**
 * Script para insertar datos académicos usando Sequelize
 * Ejecutar: node scripts/ejecutar-datos-academicos.js
 */

require('dotenv').config();
const db = require('../src/models');

async function insertarDatosAcademicos() {
  console.log('\n🔧 ========== INSERTANDO DATOS ACADÉMICOS ==========\n');
  
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conexión exitosa a la base de datos\n');

    // 1. Insertar Facultad
    console.log('1️⃣ Insertando Facultades...');
    const [facultad] = await db.Facultad.findOrCreate({
      where: { nombre: 'Facultad de Ciencias Técnicas' },
      defaults: { nombre: 'Facultad de Ciencias Técnicas' }
    });
    console.log(`   ✅ Facultad: ${facultad.nombre} (ID: ${facultad.id})\n`);

    // 2. Insertar Carreras
    console.log('2️⃣ Insertando Carreras...');
    const carreras = [
      'Tecnologías de la Información',
      'Ingeniería en Sistemas',
      'Ingeniería en Computación'
    ];
    
    for (const nombreCarrera of carreras) {
      const [carrera] = await db.Carrera.findOrCreate({
        where: { nombre: nombreCarrera },
        defaults: { 
          nombre: nombreCarrera, 
          facultad_id: facultad.id 
        }
      });
      console.log(`   ✅ ${carrera.nombre} (ID: ${carrera.id})`);
    }
    console.log('');

    // 3. Insertar Niveles
    console.log('3️⃣ Insertando Niveles...');
    const niveles = [
      { codigo: '1', nombre: 'Primero' },
      { codigo: '2', nombre: 'Segundo' },
      { codigo: '3', nombre: 'Tercero' },
      { codigo: '4', nombre: 'Cuarto' },
      { codigo: '5', nombre: 'Quinto' },
      { codigo: '6', nombre: 'Sexto' },
      { codigo: '7', nombre: 'Séptimo' },
      { codigo: '8', nombre: 'Octavo' }
    ];
    
    for (const nivelData of niveles) {
      const [nivel] = await db.Nivel.findOrCreate({
        where: { codigo: nivelData.codigo },
        defaults: { 
          codigo: nivelData.codigo, 
          nombre: nivelData.nombre, 
          estado: 'activo' 
        }
      });
      console.log(`   ✅ ${nivel.nombre} (Código: ${nivel.codigo}, ID: ${nivel.id})`);
    }
    console.log('');

    // 4. Insertar Paralelos
    console.log('4️⃣ Insertando Paralelos...');
    const paralelos = ['A', 'B', 'C', 'D', 'E'];
    
    for (const letra of paralelos) {
      const [paralelo] = await db.Paralelo.findOrCreate({
        where: { codigo: letra },
        defaults: { 
          codigo: letra, 
          nombre: letra, 
          estado: 'activo' 
        }
      });
      console.log(`   ✅ Paralelo ${paralelo.nombre} (Código: ${paralelo.codigo}, ID: ${paralelo.id})`);
    }
    console.log('');

    // 5. Insertar Organizaciones Curriculares
    console.log('5️⃣ Insertando Organizaciones Curriculares...');
    const organizaciones = [
      { codigo: 'ORG-001', nombre: 'Formación Básica' },
      { codigo: 'ORG-002', nombre: 'Formación Profesional' },
      { codigo: 'ORG-003', nombre: 'Formación Especializada' }
    ];
    
    for (const orgData of organizaciones) {
      const [org] = await db.Organizacion.findOrCreate({
        where: { codigo: orgData.codigo },
        defaults: { 
          codigo: orgData.codigo, 
          nombre: orgData.nombre, 
          estado: 'activo' 
        }
      });
      console.log(`   ✅ ${org.nombre} (ID: ${org.id})`);
    }
    console.log('');

    // 6. Insertar Asignaturas
    console.log('6️⃣ Insertando Asignaturas para Tecnologías de la Información...');
    
    const carreraTI = await db.Carrera.findOne({ 
      where: { nombre: 'Tecnologías de la Información' } 
    });
    
    const asignaturas = [
      // Nivel 1
      { nombre: 'Introducción a la Programación', codigo: 'TI-101', nivel_codigo: '1', org_codigo: 'ORG-001' },
      { nombre: 'Matemáticas Discretas', codigo: 'TI-102', nivel_codigo: '1', org_codigo: 'ORG-001' },
      
      // Nivel 2
      { nombre: 'Programación I', codigo: 'TI-201', nivel_codigo: '2', org_codigo: 'ORG-001' },
      { nombre: 'Estructuras de Datos', codigo: 'TI-202', nivel_codigo: '2', org_codigo: 'ORG-001' },
      
      // Nivel 3
      { nombre: 'Programación II', codigo: 'TI-301', nivel_codigo: '3', org_codigo: 'ORG-002' },
      { nombre: 'Bases de Datos', codigo: 'TI-302', nivel_codigo: '3', org_codigo: 'ORG-002' },
      
      // Nivel 4
      { nombre: 'Programación III', codigo: 'TI-401', nivel_codigo: '4', org_codigo: 'ORG-002' },
      { nombre: 'Desarrollo Web', codigo: 'TI-402', nivel_codigo: '4', org_codigo: 'ORG-002' },
      { nombre: 'Redes de Computadoras', codigo: 'TI-403', nivel_codigo: '4', org_codigo: 'ORG-002' },
      
      // Nivel 5
      { nombre: 'Ingeniería de Software', codigo: 'TI-501', nivel_codigo: '5', org_codigo: 'ORG-002' },
      { nombre: 'Seguridad Informática', codigo: 'TI-502', nivel_codigo: '5', org_codigo: 'ORG-003' }
    ];
    
    for (const asigData of asignaturas) {
      const nivel = await db.Nivel.findOne({ where: { codigo: asigData.nivel_codigo } });
      const org = await db.Organizacion.findOne({ where: { codigo: asigData.org_codigo } });
      
      const [asignatura] = await db.Asignatura.findOrCreate({
        where: { codigo: asigData.codigo },
        defaults: {
          nombre: asigData.nombre,
          codigo: asigData.codigo,
          estado: 'activo',
          carrera_id: carreraTI.id,
          nivel_id: nivel.id,
          organizacion_id: org.id
        }
      });
      console.log(`   ✅ ${asignatura.nombre} (${asignatura.codigo})`);
    }
    console.log('');

    // 7. Verificar totales
    console.log('7️⃣ Verificación Final:\n');
    const totales = {
      facultades: await db.Facultad.count(),
      carreras: await db.Carrera.count(),
      niveles: await db.Nivel.count(),
      paralelos: await db.Paralelo.count(),
      organizaciones: await db.Organizacion.count(),
      asignaturas: await db.Asignatura.count()
    };
    
    console.log(`   📊 Facultades: ${totales.facultades}`);
    console.log(`   📊 Carreras: ${totales.carreras}`);
    console.log(`   📊 Niveles: ${totales.niveles}`);
    console.log(`   📊 Paralelos: ${totales.paralelos}`);
    console.log(`   📊 Organizaciones: ${totales.organizaciones}`);
    console.log(`   📊 Asignaturas: ${totales.asignaturas}`);

    console.log('\n✅ ========== DATOS ACADÉMICOS INSERTADOS EXITOSAMENTE ==========\n');
    console.log('🔄 Ahora ejecuta: node scripts/diagnostico-importacion.js');
    console.log('📄 Luego usa el archivo: EJEMPLO_IMPORTACION_FULCO.csv\n');

  } catch (error) {
    console.error('❌ Error al insertar datos:', error);
    console.error(error.stack);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

insertarDatosAcademicos();
