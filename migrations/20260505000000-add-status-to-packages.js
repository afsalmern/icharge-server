"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("packages", "status", {
      type: Sequelize.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
      after: "type",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("packages", "status");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_packages_status";'
    );
  },
};
