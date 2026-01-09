const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usuario_niveles', {
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
    nivel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'nivel', key: 'id' }
    }
  }, {
    sequelize,
    tableName: 'usuario_niveles',
    schema: 'public',
    timestamps: true,
    indexes: [
      { name: 'idx_usuario_niveles_usuario_id', fields: [{ name: 'usuario_id' }] },
      { name: 'idx_usuario_niveles_nivel_id', fields: [{ name: 'nivel_id' }] },
      { name: 'uniq_usuario_nivel', unique: true, fields: [{ name: 'usuario_id' }, { name: 'nivel_id' }] }
    ]
  });
};
