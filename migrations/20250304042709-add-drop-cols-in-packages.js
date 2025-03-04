"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("packages", "createdAt");
    await queryInterface.removeColumn("packages", "updatedAt");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("packages", "createdAt", {
      allowNull: false,
      type: Sequelize.DATE,
    });

    await queryInterface.addColumn("packages", "updatedAt", {
      allowNull: false,
      type: Sequelize.DATE,
    });
  },
};
