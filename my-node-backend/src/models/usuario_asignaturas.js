const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usuario_asignaturas', {
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
    asignatura_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'asignaturas', key: 'id' }
    }
  }, {
    sequelize,
    tableName: 'usuario_asignaturas',
    schema: 'public',
    timestamps: true,
    indexes: [
      { name: 'idx_usuario_asignaturas_usuario_id', fields: [{ name: 'usuario_id' }] },
      { name: 'idx_usuario_asignaturas_asignatura_id', fields: [{ name: 'asignatura_id' }] },
      { name: 'uniq_usuario_asignatura', unique: true, fields: [{ name: 'usuario_id' }, { name: 'asignatura_id' }] }
    ]
  });
};
