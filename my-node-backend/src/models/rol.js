const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Rol = sequelize.define('rol', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Código único autogenerado para el rol'
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre del rol (ej: administrador, docente, estudiante)'
    },
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
      comment: 'Estado del rol'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['codigo']
      },
      {
        unique: true,
        fields: ['nombre']
      },
      {
        fields: ['estado']
      }
    ]
  });

  // Hooks para autogenerar código
  Rol.beforeCreate(async (rol) => {
    if (!rol.codigo) {
      const count = await Rol.count();
      rol.codigo = `ROL-${String(count + 1).padStart(4, '0')}`;
    }
  });

  return Rol;
};
