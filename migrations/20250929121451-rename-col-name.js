"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn("rentals", "return_location_id", "location_id");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn("rentals", "location_id", "return_location_id");
  },
};
