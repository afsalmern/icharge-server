"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("user_transactions", "transfer_status", {
      type: Sequelize.ENUM("pending", "success", "failed"),
      allowNull: true,
      defaultValue: "pending",
    });

    await queryInterface.changeColumn("user_transactions", "withdrawal_status", {
      type: Sequelize.ENUM("pending", "success", "failed"),
      allowNull: true,
      defaultValue: "pending",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("user_transactions", "transfer_status", {
      type: Sequelize.ENUM("pending", "success", "failed"),
      allowNull: false,
      defaultValue: "pending",
    });

    await queryInterface.changeColumn("user_transactions", "withdrawal_status", {
      type: Sequelize.ENUM("pending", "success", "failed"),
      allowNull: false,
      defaultValue: "pending",
    });
  },
};
