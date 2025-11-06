"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("boxes", "corporate_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "corporates",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("boxes", "corporate_id");
  },
};
