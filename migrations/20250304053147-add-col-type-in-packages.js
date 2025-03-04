"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("packages", "type", {
      type: Sequelize.ENUM("hourly", "weekly", "monthly"),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
   await queryInterface.removeColumn("packages", "type");
  },
};
