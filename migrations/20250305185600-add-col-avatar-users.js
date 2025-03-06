"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "avatar", {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "avatar");
  },
};
