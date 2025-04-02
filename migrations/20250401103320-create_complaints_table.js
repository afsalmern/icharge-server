"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create ENUM types first (if they don't exist)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_complaints_issue_type" AS ENUM (
          'device_not_working', 
          'battery_drain', 
          'physical_damage', 
          'charging_issue', 
          'other'
        );
      EXCEPTION WHEN duplicate_object THEN null; 
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_complaints_status" AS ENUM (
          'open', 
          'in_progress', 
          'resolved', 
          'closed'
        );
      EXCEPTION WHEN duplicate_object THEN null; 
      END $$;
    `);

    // Now create the table
    await queryInterface.createTable("complaints", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      issue_type: {
        type: "enum_complaints_issue_type",
        allowNull: true,
      },
      attachment: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      ticket_no: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      status: {
        type: "enum_complaints_status",
        allowNull: false,
        defaultValue: "open",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("complaints");

    // Drop ENUM types after table deletion
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_complaints_issue_type";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_complaints_status";`);
  },
};
