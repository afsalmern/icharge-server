"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      username: {
        type: Sequelize.STRING(50),
        defaultValue: "User",
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      mobile: {
        type: Sequelize.STRING(12),
        allowNull: false,
        unique: true,
      },
      avatar: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: " https://www.w3schools.com/howto/img_avatar.png",
      },
      dob: {
        type: Sequelize.STRING(12),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deposit_amount: {
        type: Sequelize.DECIMAL(10, 2),
        default: 0.0,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
