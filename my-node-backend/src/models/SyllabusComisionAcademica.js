// SyllabusComisionAcademica.js
// Modelo para syllabus completos subidos por la Comisión Académica

module.exports = (sequelize, DataTypes) => {
  const SyllabusComisionAcademica = sequelize.define('SyllabusComisionAcademica', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'ID único de la sesión'
    },
    nombre_archivo: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del archivo Excel subido'
    },
    periodo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del periodo académico'
    },
    periodo_academico: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre del periodo académico'
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del usuario que subió el archivo'
    },
    datos_json: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      comment: 'Datos completos del syllabus en formato JSON'
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'pendiente',
      comment: 'Estado del procesamiento: procesado, error, pendiente'
    }
  }, {
    tableName: 'syllabus_comision_academica',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_session_id_unique',
        unique: true,
        fields: ['session_id']
      },
      {
        name: 'idx_periodo',
        fields: ['periodo_id']
      }
    ]
  });

  SyllabusComisionAcademica.associate = (models) => {
    // Relación con Periodo
    if (models.Periodo) {
      SyllabusComisionAcademica.belongsTo(models.Periodo, {
        foreignKey: 'periodo_id',
        as: 'periodo'
      });
    }
  };

  return SyllabusComisionAcademica;
};
