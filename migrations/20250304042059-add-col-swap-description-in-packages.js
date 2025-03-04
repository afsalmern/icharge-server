"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("packages", "description", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("packages", "swap", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("packages", "description");
    await queryInterface.removeColumn("packages", "swap");
  },
};
