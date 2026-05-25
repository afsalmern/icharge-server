"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("watti_template_configs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      template_name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      header_type: {
        type: Sequelize.ENUM("TEXT", "IMAGE", "VIDEO", "DOCUMENT", "NONE"),
        allowNull: false,
        defaultValue: "NONE",
      },
      header_mapping_type: {
        type: Sequelize.ENUM("static", "dynamic"),
        allowNull: false,
        defaultValue: "static",
      },
      header_mapping_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      body_mappings: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("watti_template_configs");
  },
};
