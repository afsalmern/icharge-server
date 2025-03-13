"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("rentals", "power_number", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn("rentals", "machine_id", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn("rentals", "position_id", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("rentals", "power_number");
    await queryInterface.removeColumn("rentals", "machine_id");
    await queryInterface.removeColumn("rentals", "position_id");
  },
};
