"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("user_transactions", "type", {
      type: Sequelize.ENUM("withdraw", "deposit"),
      allowNull: true,
    });

    await queryInterface.addColumn("user_transactions", "transfer_status", {
      type: Sequelize.ENUM("pending", "success", "failed"),
      allowNull: true,
      defaultValue: "pending",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("user_transactions", "type");
    await queryInterface.removeColumn("user_transactions", "transfer_status");
  },
};
