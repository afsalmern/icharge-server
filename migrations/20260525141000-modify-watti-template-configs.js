"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Remove obsolete header fields
    await queryInterface.removeColumn("watti_template_configs", "header_type");
    await queryInterface.removeColumn("watti_template_configs", "header_mapping_type");
    await queryInterface.removeColumn("watti_template_configs", "header_mapping_value");

    // 2. Add broadcast_name field
    await queryInterface.addColumn("watti_template_configs", "broadcast_name", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "Watti Broadcast",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Remove broadcast_name
    await queryInterface.removeColumn("watti_template_configs", "broadcast_name");

    // 2. Add obsolete header fields back
    await queryInterface.addColumn("watti_template_configs", "header_type", {
      type: Sequelize.ENUM("TEXT", "IMAGE", "VIDEO", "DOCUMENT", "NONE"),
      allowNull: false,
      defaultValue: "NONE",
    });
    await queryInterface.addColumn("watti_template_configs", "header_mapping_type", {
      type: Sequelize.ENUM("static", "dynamic"),
      allowNull: false,
      defaultValue: "static",
    });
    await queryInterface.addColumn("watti_template_configs", "header_mapping_value", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};
