'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      codigo: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: true,
        comment: 'Código único autogenerado para el rol'
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Nombre del rol'
      },
      estado: {
        type: Sequelize.ENUM('activo', 'inactivo'),
        allowNull: false,
        defaultValue: 'activo',
        comment: 'Estado del rol'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Crear índices
    await queryInterface.addIndex('roles', ['codigo'], {
      unique: true,
      name: 'idx_roles_codigo'
    });

    await queryInterface.addIndex('roles', ['nombre'], {
      unique: true,
      name: 'idx_roles_nombre'
    });

    await queryInterface.addIndex('roles', ['estado'], {
      name: 'idx_roles_estado'
    });

    // Insertar roles por defecto
    await queryInterface.bulkInsert('roles', [
      {
        codigo: 'ROL-0001',
        nombre: 'administrador',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        codigo: 'ROL-0002',
        nombre: 'docente',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        codigo: 'ROL-0003',
        nombre: 'profesor',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        codigo: 'ROL-0004',
        nombre: 'estudiante',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        codigo: 'ROL-0005',
        nombre: 'comision',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        codigo: 'ROL-0006',
        nombre: 'direccion',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        codigo: 'ROL-0007',
        nombre: 'decano',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        codigo: 'ROL-0008',
        nombre: 'subdecano',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('roles');
  }
};
