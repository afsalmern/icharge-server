"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "deposit_amount", {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "deposit_amount", {
      type: Sequelize.DECIMAL(10, 2),
      default: 0.0,
    });
  },
};
