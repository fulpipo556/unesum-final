/**
 * Test simulando EXACTAMENTE lo que hace el endpoint /upload
 */

require('dotenv').config();
const db = require('../src/models');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

function createPasswordResetToken() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expirationDate = new Date(Date.now() + 3600000); // 1 hora
  return { resetToken, hashedToken, expirationDate };
}

async function simularImportacion() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Simular que multer guarda el archivo
    const csvOriginal = path.resolve(__dirname, '../../IMPORTAR_PROFESORES_FINAL.csv');
    const csvTempPath = path.resolve(__dirname, '../uploads/test-upload.csv');
    
    // Crear carpeta uploads si no existe
    const uploadsDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Copiar archivo (simular multer)
    fs.copyFileSync(csvOriginal, csvTempPath);
    console.log('📁 Archivo copiado a uploads/\n');

    // Leer exactamente como lo hace el controlador
    const filePath = csvTempPath;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log('📊 Datos parseados:', data.length, 'filas');
    console.log('🔍 Primera fila:', JSON.stringify(data[0], null, 2));
    console.log('🔍 Columnas detectadas:', data[0] ? Object.keys(data[0]) : 'ninguna');
    console.log('\n');

    // Cargar datos de referencia
    const todasAsignaturas = await db.Asignatura.findAll();
    const todosNiveles = await db.Nivel.findAll();
    const todosParalelos = await db.Paralelo.findAll();
    const todasCarreras = await db.Carrera.findAll();
    
    console.log(`✅ Datos cargados: ${todasAsignaturas.length} asignaturas, ${todosNiveles.length} niveles, ${todosParalelos.length} paralelos, ${todasCarreras.length} carreras\n`);

    const normalizar = (texto) => {
      return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };

    // Procesar SOLO primera fila
    const fila = data[0];
    console.log('🔄 Procesando fila:', JSON.stringify(fila, null, 2));
    console.log('\n');
    
    const { Docente, Carrera: carreraNombre, Asinatura, Nivel, Paralelo, Rol } = fila;

    if (!Docente || !carreraNombre) {
      console.log('❌ Falta Docente o Carrera');
      process.exit(1);
    }

    const nombreCompleto = Docente.trim().split(' ');
    const nombres = nombreCompleto.slice(0, -1).join(' ') || nombreCompleto[0];
    const apellidos = nombreCompleto.slice(-1).join(' ') || '';
    
    console.log(`👤 Procesando: ${nombres} ${apellidos}`);

    // Buscar carrera
    const carrera = todasCarreras.find(c => {
      const nombreCarreraNorm = normalizar(c.nombre);
      const busquedaNorm = normalizar(carreraNombre.trim());
      return nombreCarreraNorm.includes(busquedaNorm) || busquedaNorm.includes(nombreCarreraNorm);
    });

    if (!carrera) {
      console.log(`❌ Carrera no encontrada: "${carreraNombre}"`);
      console.log(`   Carreras disponibles: ${todasCarreras.map(c => c.nombre).join(', ')}`);
      process.exit(1);
    }
    console.log(`✅ Carrera encontrada: "${carrera.nombre}" (ID: ${carrera.id})`);

    // Generar email
    const baseEmail = `${nombres.toLowerCase().replace(/\s/g, '.')}.${apellidos.toLowerCase().replace(/\s/g, '.')}@unesum.edu.ec`;
    console.log(`📧 Email: ${baseEmail}`);

    // Parsear asignaturas
    let asignaturas = [];
    if (Asinatura) {
      let asignaturasTexto = Asinatura.trim();
      if (asignaturasTexto.startsWith('(') && asignaturasTexto.endsWith(')')) {
        asignaturasTexto = asignaturasTexto.slice(1, -1);
      }
      const asignaturasNombres = asignaturasTexto.split(',').map(a => a.trim());
      asignaturas = asignaturasNombres.map(nombre => {
        const busquedaNorm = normalizar(nombre);
        
        // Primero: buscar coincidencia exacta
        let encontrada = todasAsignaturas.find(asig => {
          const nombreAsigNorm = normalizar(asig.nombre);
          return nombreAsigNorm === busquedaNorm;
        });
        
        // Si no: buscar que el nombre de la BD contenga la búsqueda
        if (!encontrada) {
          encontrada = todasAsignaturas.find(asig => {
            const nombreAsigNorm = normalizar(asig.nombre);
            return nombreAsigNorm.includes(busquedaNorm);
          });
        }
        
        // Si no: buscar que la búsqueda contenga el nombre de la BD  
        if (!encontrada) {
          encontrada = todasAsignaturas.find(asig => {
            const nombreAsigNorm = normalizar(asig.nombre);
            return busquedaNorm.includes(nombreAsigNorm);
          });
        }
        
        console.log(`     "${nombre}" → ${encontrada ? `✅ ${encontrada.nombre} (ID: ${encontrada.id})` : '❌ No encontrada'}`);
        return encontrada;
      }).filter(Boolean);
      console.log(`   Total encontradas: ${asignaturas.length}/${asignaturasNombres.length}`);
      asignaturas.forEach((a, i) => console.log(`   ${i + 1}. ${a.nombre} (ID: ${a.id})`));
    }

    // Parsear niveles
    let niveles = [];
    if (Nivel) {
      let nivelesTexto = Nivel.trim();
      if (nivelesTexto.startsWith('(') && nivelesTexto.endsWith(')')) {
        nivelesTexto = nivelesTexto.slice(1, -1);
      }
      const nivelesNombres = nivelesTexto.split(',').map(n => n.trim());
      niveles = nivelesNombres.map(nombre => {
        const busquedaNorm = normalizar(nombre);
        
        // Primero: buscar coincidencia exacta
        let encontrado = todosNiveles.find(niv => {
          const nombreNivNorm = normalizar(niv.nombre);
          return nombreNivNorm === busquedaNorm;
        });
        
        // Si no: buscar que el nombre de la BD contenga la búsqueda
        if (!encontrado) {
          encontrado = todosNiveles.find(niv => {
            const nombreNivNorm = normalizar(niv.nombre);
            return nombreNivNorm.includes(busquedaNorm);
          });
        }
        
        // Si no: buscar que la búsqueda contenga el nombre de la BD
        if (!encontrado) {
          encontrado = todosNiveles.find(niv => {
            const nombreNivNorm = normalizar(niv.nombre);
            return busquedaNorm.includes(nombreNivNorm);
          });
        }
        
        console.log(`     "${nombre}" → ${encontrado ? `✅ ${encontrado.nombre} (ID: ${encontrado.id})` : '❌ No encontrado'}`);
        return encontrado;
      }).filter(Boolean);
      console.log(`   Total encontrados: ${niveles.length}/${nivelesNombres.length}`);
      niveles.forEach((n, i) => console.log(`   ${i + 1}. ${n.nombre} (ID: ${n.id})`));
    }

    // Parsear paralelos
    let paralelosGrupos = [];
    if (Paralelo) {
      let paralelosTexto = Paralelo.trim();
      
      if (paralelosTexto.startsWith('((') && paralelosTexto.endsWith('))')) {
        paralelosTexto = paralelosTexto.slice(1, -1);
      }
      
      const gruposMatch = paralelosTexto.match(/\(([^)]+)\)/g);
      
      if (gruposMatch) {
        paralelosGrupos = gruposMatch.map(grupo => {
          const letras = grupo.replace(/[()]/g, '').split(',').map(p => p.trim());
          return letras.map(letra => {
            return todosParalelos.find(par => 
              par.nombre.toLowerCase() === letra.toLowerCase() ||
              par.codigo.toLowerCase() === letra.toLowerCase()
            );
          }).filter(Boolean);
        });
      } else {
        const letras = paralelosTexto.split(',').map(p => p.trim());
        const grupoUnico = letras.map(letra => {
          return todosParalelos.find(par => 
            par.nombre.toLowerCase() === letra.toLowerCase() ||
            par.codigo.toLowerCase() === letra.toLowerCase()
          );
        }).filter(Boolean);
        paralelosGrupos = [grupoUnico];
      }
      console.log(`🎯 Grupos de paralelos: ${paralelosGrupos.length}`);
      paralelosGrupos.forEach((grupo, i) => {
        console.log(`   Grupo ${i + 1}: ${grupo.map(p => p.nombre).join(', ')}`);
      });
    }

    // Validar
    if (asignaturas.length === 0 || niveles.length === 0) {
      console.error('❌ Debe especificar al menos una asignatura y un nivel válidos');
      process.exit(1);
    }

    if (asignaturas.length !== niveles.length) {
      console.error(`❌ Cantidad de asignaturas (${asignaturas.length}) no coincide con niveles (${niveles.length})`);
      process.exit(1);
    }

    if (paralelosGrupos.length > 0 && paralelosGrupos.length !== asignaturas.length) {
      console.error(`❌ Cantidad de grupos de paralelos (${paralelosGrupos.length}) no coincide con asignaturas (${asignaturas.length})`);
      process.exit(1);
    }

    // Crear combinaciones
    const combinaciones = [];
    for (let i = 0; i < asignaturas.length; i++) {
      const asignatura = asignaturas[i];
      const nivel = niveles[i];
      const paralelosDelNivel = paralelosGrupos[i] || [];

      if (paralelosDelNivel.length > 0) {
        for (const paralelo of paralelosDelNivel) {
          combinaciones.push({ asignatura, nivel, paralelo });
        }
      } else {
        combinaciones.push({ asignatura, nivel, paralelo: null });
      }
    }

    console.log(`\n✅ ${combinaciones.length} registros serían creados:`);
    for (let idx = 0; idx < combinaciones.length; idx++) {
      const { asignatura, nivel, paralelo } = combinaciones[idx];
      const email = combinaciones.length > 1 
        ? baseEmail.replace('@', `${idx + 1}@`)
        : baseEmail;

      console.log(`\n${idx + 1}. Email: ${email}`);
      console.log(`   Asignatura: ${asignatura.nombre}`);
      console.log(`   Nivel: ${nivel.nombre}`);
      console.log(`   Paralelo: ${paralelo ? paralelo.nombre : 'N/A'}`);
      console.log(`   Carrera ID: ${carrera.id}`);

      // Verificar si existe
      const existente = await db.Profesor.findOne({ where: { email } });
      if (existente) {
        console.log(`   ⚠️ Ya existe un profesor con este email (ID: ${existente.id})`);
        continue;
      }

      console.log('   ✅ Listo para crear');
    }

    // Limpiar archivo temporal
    fs.unlinkSync(csvTempPath);
    console.log('\n✅ Test completado. Archivo temporal eliminado.');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error(error.stack);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

simularImportacion();
