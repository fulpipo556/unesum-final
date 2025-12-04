// models/index.js

const { sequelize } = require('../config/db');
const Sequelize = require('sequelize');
const User = require('./User');
const Sustantivo = require('./Sustantivo');
const initUsuario = require('./usuarios');
const initFuncionesSustantivas = require('./funciones_sustantivas');
const initParalelo= require('./paralelo');
const initNivel= require('./nivel');
const initOrganizacion= require('./organizacion');
const initProgramasAnaliticos = require('./programas_analiticos');
const initFacultad = require('./facultades');
const initCarrera = require('./carreras');
const initProfesor = require('./profesores');
const initSyllabus = require('./syllabi');
const initAsignatura = require('./asignaturas');
const initDistribucionHoras = require('./distribucion_horas');
const initUnidadTematica = require('./unidades_tematicas');
const initAsignaturaRequisito = require('./asignatura_requisitos');
const initperiodo = require('./periodos');
const initMalla = require('./mallas');
// =========================================================================
// --- PASO 1: IMPORTA TU NUEVO MODELO ---
// Asegúrate de que el nombre del archivo sea correcto ('./clasificacion_academica')
// =========================================================================
const initClasificacionAcademica = require('./clasificacion_academica');


// Inicializa el modelo Usuario
const Usuario = initUsuario(sequelize, Sequelize.DataTypes);
const FuncionesSustantivas = initFuncionesSustantivas(sequelize, Sequelize.DataTypes); 
const Paralelo = initParalelo(sequelize, Sequelize.DataTypes);
const Nivel = initNivel(sequelize, Sequelize.DataTypes);
const Organizacion = initOrganizacion(sequelize, Sequelize.DataTypes);
const ProgramasAnaliticos = initProgramasAnaliticos(sequelize, Sequelize.DataTypes); 
const Facultad = initFacultad(sequelize, Sequelize.DataTypes);
const Carrera = initCarrera(sequelize, Sequelize.DataTypes);
const Profesor = initProfesor(sequelize, Sequelize.DataTypes)
const Syllabus = initSyllabus(sequelize, Sequelize.DataTypes);
const Asignatura = initAsignatura(sequelize, Sequelize.DataTypes);
const DistribucionHoras = initDistribucionHoras(sequelize, Sequelize.DataTypes);
const UnidadTematica = initUnidadTematica(sequelize, Sequelize.DataTypes);
const AsignaturaRequisito = initAsignaturaRequisito(sequelize, Sequelize.DataTypes);
const Periodo = initperiodo(sequelize, Sequelize.DataTypes);
const Malla = initMalla(sequelize, Sequelize.DataTypes);

// =========================================================================
// --- PASO 2: INICIALIZA TU NUEVO MODELO ---
// =========================================================================
const ClasificacionAcademica = initClasificacionAcademica(sequelize, Sequelize.DataTypes);


// Definir relaciones
User.hasMany(Sustantivo, { foreignKey: 'usuario_id', as: 'sustantivos' });
Sustantivo.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

ProgramasAnaliticos.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'creador' });

Facultad.hasMany(Carrera, { foreignKey: 'facultad_id', as: 'carreras' });
Carrera.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });

Carrera.hasMany(Profesor, { foreignKey: 'carrera_id', as: 'profesores' });
Profesor.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

Profesor.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });
Asignatura.hasMany(Profesor, { foreignKey: 'asignatura_id', as: 'profesores' });

Profesor.belongsTo(Nivel, { foreignKey: 'nivel_id', as: 'nivel' });
Nivel.hasMany(Profesor, { foreignKey: 'nivel_id', as: 'profesores' });

Profesor.belongsTo(Paralelo, { foreignKey: 'paralelo_id', as: 'paralelo' });
Paralelo.hasMany(Profesor, { foreignKey: 'paralelo_id', as: 'profesores' });

Syllabus.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'creador' });
Syllabus.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });
Profesor.hasMany(Syllabus, { foreignKey: 'profesor_id', as: 'syllabi' });

Carrera.hasMany(Asignatura, { foreignKey: 'carrera_id', as: 'asignaturas' });
Asignatura.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

Nivel.hasMany(Asignatura, { foreignKey: 'nivel_id', as: 'asignaturas' });
Asignatura.belongsTo(Nivel, { foreignKey: 'nivel_id', as: 'nivel' });

Organizacion.hasMany(Asignatura, { foreignKey: 'organizacion_id', as: 'asignaturas' });
Asignatura.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });

Asignatura.hasOne(DistribucionHoras, { foreignKey: 'asignatura_id', as: 'horas' });
DistribucionHoras.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

Asignatura.hasMany(UnidadTematica, { foreignKey: 'asignatura_id', as: 'unidades' });
UnidadTematica.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

// Relación para requisitos (belongsToMany)
Asignatura.belongsToMany(Asignatura, {
  through: AsignaturaRequisito,
  as: 'requisitos',
  foreignKey: 'asignatura_id',
  otherKey: 'requisito_id'
});

// Relación hasMany para poder incluir AsignaturaRequisito directamente
Asignatura.hasMany(AsignaturaRequisito, { foreignKey: 'asignatura_id', as: 'asignatura_requisitos' });
AsignaturaRequisito.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

// Relación para acceder al requisito desde AsignaturaRequisito
AsignaturaRequisito.belongsTo(Asignatura, { foreignKey: 'requisito_id', as: 'requisito' });

// =========================================================================
// --- PASO 3: DEFINE LAS ASOCIACIONES DE TU NUEVO MODELO ---
// =========================================================================
ClasificacionAcademica.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Carrera.hasOne(ClasificacionAcademica, { foreignKey: 'carrera_id', as: 'clasificacion' });

Malla.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Facultad.hasMany(Malla, { foreignKey: 'facultad_id', as: 'mallas' });

Malla.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Carrera.hasMany(Malla, { foreignKey: 'carrera_id', as: 'mallas' });


module.exports = {
  sequelize,
  User,
  Sustantivo,
  Paralelo,
  Organizacion,
  Nivel,
  Usuario,
  FuncionesSustantivas,
  ProgramasAnaliticos,
  Facultad,
  Carrera,
  Profesor,
  Syllabus,
  Asignatura,
  DistribucionHoras,
  UnidadTematica,
  AsignaturaRequisito,
  // =========================================================================
  // --- PASO 4: EXPORTA TU NUEVO MODELO ---
  // =========================================================================
  ClasificacionAcademica, 
  Periodo,
  Malla,
};