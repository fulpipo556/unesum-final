const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usuario_roles', {
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
    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'roles', key: 'id' }
    }
  }, {
    sequelize,
    tableName: 'usuario_roles',
    schema: 'public',
    timestamps: true,
    indexes: [
      { name: 'idx_usuario_roles_usuario_id', fields: [{ name: 'usuario_id' }] },
      { name: 'idx_usuario_roles_rol_id', fields: [{ name: 'rol_id' }] },
      { name: 'uniq_usuario_rol', unique: true, fields: [{ name: 'usuario_id' }, { name: 'rol_id' }] }
    ]
  });
};