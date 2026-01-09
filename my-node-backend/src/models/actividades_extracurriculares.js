const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('actividades_extracurriculares', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    periodo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'periodos',
        key: 'id'
      }
    },
    semana: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    actividades: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'actividades_extracurriculares',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "actividades_extracurriculares_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_actividades_extracurriculares_periodo",
        fields: [
          { name: "periodo_id" },
        ]
      },
      {
        name: "idx_actividades_extracurriculares_semana",
        fields: [
          { name: "semana" },
        ]
      },
      {
        name: "idx_actividades_extracurriculares_fechas",
        fields: [
          { name: "fecha_inicio" },
          { name: "fecha_fin" },
        ]
      }
    ]
  });
};
