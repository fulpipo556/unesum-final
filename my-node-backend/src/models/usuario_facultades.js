const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usuario_facultades', {
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
    facultad_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'facultades', key: 'id' }
    }
  }, {
    sequelize,
    tableName: 'usuario_facultades',
    schema: 'public',
    timestamps: true,
    indexes: [
      { name: 'idx_usuario_facultades_usuario_id', fields: [{ name: 'usuario_id' }] },
      { name: 'idx_usuario_facultades_facultad_id', fields: [{ name: 'facultad_id' }] },
      { name: 'uniq_usuario_facultad', unique: true, fields: [{ name: 'usuario_id' }, { name: 'facultad_id' }] }
    ]
  });
};