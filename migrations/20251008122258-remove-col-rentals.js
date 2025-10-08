"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("rentals", "rental_status");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("rentals", "rental_status", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "pending",
    });
  },
};
