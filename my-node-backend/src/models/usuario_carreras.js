const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usuario_carreras', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' }
    },
    carrera_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'carreras', key: 'id' }
    }
  }, {
    sequelize,
    tableName: 'usuario_carreras',
    schema: 'public',
    timestamps: true,
    indexes: [
      { name: 'idx_usuario_carreras_usuario_id', fields: [{ name: 'usuario_id' }] },
      { name: 'idx_usuario_carreras_carrera_id', fields: [{ name: 'carrera_id' }] },
      { name: 'uniq_usuario_carrera', unique: true, fields: [{ name: 'usuario_id' }, { name: 'carrera_id' }] }
    ]
  });
};