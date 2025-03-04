"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("packages", "created_at", {
      allowNull: false,
      type: Sequelize.DATE,
    });
    await queryInterface.addColumn("packages", "updated_at", {
      allowNull: false,
      type: Sequelize.DATE,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("packages", "created_at");
    await queryInterface.removeColumn("packages", "updated_at");
  },
};
