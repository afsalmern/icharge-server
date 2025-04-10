"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("powerbanks", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      box_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "boxes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      unique_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM("available", "rented", "charging", "maintenance", "lost"),
        allowNull: false,
        defaultValue: "available",
      },
      battery_level: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 100.0,
      },
      health_status: {
        type: Sequelize.ENUM("good", "degraded", "needs_replacement"),
        allowNull: false,
        defaultValue: "good",
      },
      slot_number: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      last_back_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      raw_metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("powerbanks");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_powerbanks_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_powerbanks_health_status";');
  },
};
