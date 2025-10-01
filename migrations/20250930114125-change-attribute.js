"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("rentals", "return_time");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("rentals", "return_time", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
