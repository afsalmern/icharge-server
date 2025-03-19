"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("user_transactions", "status");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("user_transactions", "status", {
      type: Sequelize.ENUM("pending", "success", "failed"),
      allowNull: false,
      defaultValue: "pending",
    });
  },
};
