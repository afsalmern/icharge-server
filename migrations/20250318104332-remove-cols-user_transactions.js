"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove unnecessary columns
    await queryInterface.removeColumn("user_transactions", "transfer_status");
    await queryInterface.removeColumn("user_transactions", "withdrawal_status");
  },

  async down(queryInterface, Sequelize) {
    // Re-add status column
    await queryInterface.addColumn("user_transactions", "status", {
      type: Sequelize.ENUM("pending", "success", "failed"),
      allowNull: true,
      defaultValue: "pending",
    });

    await queryInterface.addColumn("user_transactions", "transfer_status", {
      type: Sequelize.ENUM("pending", "success", "failed"),
      allowNull: true,
      defaultValue: "pending",
    });
  },
};
