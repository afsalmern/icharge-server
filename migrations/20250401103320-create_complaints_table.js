"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("complaints", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
        type: Sequelize.ENUM("device_not_working", "battery_drain", "physical_damage", "charging_issue", "other"),
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
        type: Sequelize.ENUM("open", "in_progress", "resolved", "closed"),
        allowNull: false,
        defaultValue: "open",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("complaints");
  },
};
