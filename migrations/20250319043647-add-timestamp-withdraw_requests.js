"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("withdraw_requests", "created_at", {
      type: Sequelize.DATE,
      allowNull: false,
    });

    await queryInterface.addColumn("withdraw_requests", "updated_at", {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("withdraw_requests", "created_at");
    await queryInterface.removeColumn("withdraw_requests", "updated_at");
  },
};
