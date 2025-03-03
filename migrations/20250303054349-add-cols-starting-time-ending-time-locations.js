"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("locations", "starting_hour", {
      type: Sequelize.TIME,
      allowNull: false,
    });

    await queryInterface.addColumn("locations", "ending_hour", {
      type: Sequelize.TIME,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("locations", "starting_hour");
    await queryInterface.removeColumn("locations", "ending_hour");
  },
};
