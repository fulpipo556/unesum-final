// comisionAcademicaController.js
// Controlador para la Comisión Académica - Procesamiento de Syllabus completos en Excel

const db = require('../models');
const xlsx = require('xlsx');

// 🎯 PROCESAR EXCEL COMPLETO DE COMISIÓN ACADÉMICA
exports.procesarSyllabusCompleto = async (req, res) => {
  try {
    if (!req.files || !req.files.archivo || req.files.archivo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo'
      });
    }

    const archivo = req.files.archivo[0];
    const { periodo_id, periodo_academico } = req.body;

    // Validar que sea Excel
    const validExcelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validExcelTypes.includes(archivo.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se permiten archivos Excel (.xlsx, .xls)'
      });
    }

    console.log('📊 [COMISIÓN] Procesando Excel completo...');

    // Leer el Excel
    const workbook = xlsx.read(archivo.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // 🔍 EXTRAER SECCIONES DEL SYLLABUS
    const syllabusData = {
      archivo: archivo.originalname,
      periodo_id: periodo_id,
      periodo_academico: periodo_academico,
      fecha_subida: new Date(),
      secciones: []
    };

    // SECCIÓN 1: DATOS GENERALES Y ESPECÍFICOS
    const datosGenerales = extraerDatosGenerales(data);
    if (datosGenerales) {
      syllabusData.secciones.push({
        nombre: 'DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA',
        tipo: 'tabla_clave_valor',
        icono: '📋',
        color: 'blue',
        orden: 1,
        datos: datosGenerales
      });
    }

    // SECCIÓN 2: ESTRUCTURA DE LA ASIGNATURA
    const estructuraAsignatura = extraerEstructuraAsignatura(data);
    if (estructuraAsignatura) {
      syllabusData.secciones.push({
        nombre: 'ESTRUCTURA DE LA ASIGNATURA',
        tipo: 'tabla_compleja',
        icono: '📊',
        color: 'green',
        orden: 2,
        datos: estructuraAsignatura
      });
    }

    // SECCIÓN 3: RESULTADOS Y EVALUACIÓN
    const resultadosEvaluacion = extraerResultadosEvaluacion(data);
    if (resultadosEvaluacion) {
      syllabusData.secciones.push({
        nombre: 'RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES',
        tipo: 'tabla_compleja',
        icono: '✅',
        color: 'purple',
        orden: 3,
        datos: resultadosEvaluacion
      });
    }

    // Guardar en base de datos
    const SyllabusComisionAcademica = db.SyllabusComisionAcademica;
    const sessionId = `ca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const syllabusCreaddo = await SyllabusComisionAcademica.create({
      session_id: sessionId,
      nombre_archivo: archivo.originalname,
      periodo_id: periodo_id,
      periodo_academico: periodo_academico,
      usuario_id: req.user?.id,
      datos_json: JSON.stringify(syllabusData),
      estado: 'procesado'
    });

    console.log(`✅ [COMISIÓN] Syllabus procesado: ${sessionId}`);

    return res.status(200).json({
      success: true,
      message: 'Syllabus procesado exitosamente',
      data: {
        sessionId: sessionId,
        nombreArchivo: archivo.originalname,
        totalSecciones: syllabusData.secciones.length,
        secciones: syllabusData.secciones.map(s => ({
          nombre: s.nombre,
          tipo: s.tipo,
          icono: s.icono
        }))
      }
    });

  } catch (error) {
    console.error('❌ [COMISIÓN] Error procesando syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error procesando syllabus',
      error: error.message
    });
  }
};

// 📋 FUNCIÓN: Extraer Datos Generales
function extraerDatosGenerales(data) {
  const campos = {};
  let encontrado = false;

  for (let i = 0; i < data.length; i++) {
    const fila = data[i];
    const texto = fila[0]?.toString().trim();

    // Buscar campos conocidos
    if (texto && texto.includes('Código de Asignatura')) {
      campos['codigo_asignatura'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Nombre de la asignatura')) {
      campos['nombre_asignatura'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Prerrequisito')) {
      campos['prerrequisito'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Correquisito')) {
      campos['correquisito'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Facultad')) {
      campos['facultad'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Carrera')) {
      campos['carrera'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Unidad curricular')) {
      campos['unidad_curricular'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Campo de formación')) {
      campos['campo_formacion'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Modalidad')) {
      campos['modalidad'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Periodo académico ordinario')) {
      campos['periodo_academico'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Nivel')) {
      campos['nivel'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Paralelo')) {
      campos['paralelo'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Horario de clases')) {
      campos['horario_clases'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Horario para tutorías')) {
      campos['horario_tutorias'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Profesor que imparte')) {
      campos['profesor'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Perfil del profesor')) {
      campos['perfil_profesor'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Total de horas')) {
      campos['total_horas'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Horas de docencia presencial')) {
      campos['horas_docencia'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('PFAE')) {
      campos['horas_pfae'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('Horas de trabajo autónomo')) {
      campos['horas_autonomo'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('prácticas preprofesionales')) {
      campos['horas_practicas'] = fila[2] || '';
      encontrado = true;
    } else if (texto && texto.includes('vinculación con la sociedad')) {
      campos['horas_vinculacion'] = fila[2] || '';
      encontrado = true;
    }
  }

  return encontrado ? campos : null;
}

// 📊 FUNCIÓN: Extraer Estructura de la Asignatura
function extraerEstructuraAsignatura(data) {
  const unidades = [];
  let encontrado = false;

  for (let i = 0; i < data.length; i++) {
    const fila = data[i];
    const texto = fila[0]?.toString().trim();

    // Buscar tabla de estructura
    if (texto && texto.includes('ESTRUCTURA DE LA ASIGNATURA')) {
      encontrado = true;
      // Buscar encabezados de la tabla
      for (let j = i + 1; j < data.length && j < i + 50; j++) {
        const filaData = data[j];
        
        // Si tiene datos válidos, guardar
        if (filaData[1] && filaData[1].toString().trim()) {
          unidades.push({
            unidad_tematica: filaData[0] || '',
            contenidos: filaData[1] || '',
            horas_presencial: filaData[2] || '',
            horas_sincronas: filaData[3] || '',
            pfae: filaData[4] || '',
            ta: filaData[5] || '',
            metodologias: filaData[6] || '',
            recursos: filaData[7] || '',
            escenario: filaData[8] || '',
            bibliografia: filaData[9] || '',
            fecha: filaData[10] || ''
          });
        }
      }
      break;
    }
  }

  return encontrado && unidades.length > 0 ? { columnas: getColumnasEstructura(), filas: unidades } : null;
}

// 📈 FUNCIÓN: Extraer Resultados y Evaluación
function extraerResultadosEvaluacion(data) {
  const resultados = [];
  let encontrado = false;

  for (let i = 0; i < data.length; i++) {
    const fila = data[i];
    const texto = fila[0]?.toString().trim();

    // Buscar sección de resultados
    if (texto && texto.includes('RESULTADOS Y EVALUACIÓN')) {
      encontrado = true;
      // Extraer datos de la tabla
      for (let j = i + 1; j < data.length && j < i + 50; j++) {
        const filaData = data[j];
        
        if (filaData[1] && filaData[1].toString().trim()) {
          resultados.push({
            unidad_tematica: filaData[0] || '',
            contenidos: filaData[1] || '',
            resultados_aprendizaje: filaData[2] || '',
            criterios_evaluacion: filaData[3] || '',
            instrumentos_evaluacion: filaData[4] || ''
          });
        }
      }
      break;
    }
  }

  return encontrado && resultados.length > 0 ? { columnas: getColumnasResultados(), filas: resultados } : null;
}

// Definir columnas para visualización
function getColumnasEstructura() {
  return [
    { key: 'unidad_tematica', label: 'Unidades temáticas' },
    { key: 'contenidos', label: 'CONTENIDOS' },
    { key: 'horas_presencial', label: 'Presencial' },
    { key: 'horas_sincronas', label: 'Sincrónas' },
    { key: 'pfae', label: 'PFAE' },
    { key: 'ta', label: 'TA' },
    { key: 'metodologias', label: 'Metodologías de enseñanza-aprendizaje' },
    { key: 'recursos', label: 'Recursos didácticos' },
    { key: 'escenario', label: 'Escenario de aprendizaje' },
    { key: 'bibliografia', label: 'Bibliografía/Fuentes de consulta' },
    { key: 'fecha', label: 'Fecha/paralelo' }
  ];
}

function getColumnasResultados() {
  return [
    { key: 'unidad_tematica', label: 'Unidades temáticas' },
    { key: 'contenidos', label: 'CONTENIDOS' },
    { key: 'resultados_aprendizaje', label: 'Resultados de aprendizaje' },
    { key: 'criterios_evaluacion', label: 'Criterios de evaluación' },
    { key: 'instrumentos_evaluacion', label: 'Instrumentos de evaluación' }
  ];
}

// 📋 LISTAR SYLLABUS DE COMISIÓN ACADÉMICA
exports.listarSyllabusComision = async (req, res) => {
  try {
    const SyllabusComisionAcademica = db.SyllabusComisionAcademica;
    
    const syllabus = await SyllabusComisionAcademica.findAll({
      order: [['created_at', 'DESC']],
      limit: 50
    });

    return res.status(200).json({
      success: true,
      data: syllabus
    });

  } catch (error) {
    console.error('❌ Error listando syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error listando syllabus',
      error: error.message
    });
  }
};

// 📄 OBTENER SYLLABUS ESPECÍFICO
exports.obtenerSyllabusComision = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const SyllabusComisionAcademica = db.SyllabusComisionAcademica;
    
    const syllabus = await SyllabusComisionAcademica.findOne({
      where: { session_id: sessionId }
    });

    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus no encontrado'
      });
    }

    // Parsear JSON
    const datos = JSON.parse(syllabus.datos_json);

    return res.status(200).json({
      success: true,
      data: {
        ...syllabus.toJSON(),
        datos_json: datos
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo syllabus',
      error: error.message
    });
  }
};

// 🗑️ ELIMINAR SYLLABUS
exports.eliminarSyllabusComision = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const SyllabusComisionAcademica = db.SyllabusComisionAcademica;
    
    const eliminado = await SyllabusComisionAcademica.destroy({
      where: { session_id: sessionId }
    });

    if (eliminado === 0) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Syllabus eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error eliminando syllabus',
      error: error.message
    });
  }
};

module.exports = exports;
