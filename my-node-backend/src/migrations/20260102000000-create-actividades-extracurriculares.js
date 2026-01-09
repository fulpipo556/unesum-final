'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('actividades_extracurriculares', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      periodo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'periodo',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Referencia al periodo académico'
      },
      semana: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Número de semana (1-16)'
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Fecha de inicio de la actividad'
      },
      fecha_fin: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Fecha de fin de la actividad'
      },
      actividades: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Descripción de las actividades extracurriculares'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Crear índices para mejorar el rendimiento
    await queryInterface.addIndex('actividades_extracurriculares', ['periodo_id'], {
      name: 'idx_actividades_extracurriculares_periodo'
    });

    await queryInterface.addIndex('actividades_extracurriculares', ['semana'], {
      name: 'idx_actividades_extracurriculares_semana'
    });

    await queryInterface.addIndex('actividades_extracurriculares', ['fecha_inicio', 'fecha_fin'], {
      name: 'idx_actividades_extracurriculares_fechas'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('actividades_extracurriculares');
  }
};
