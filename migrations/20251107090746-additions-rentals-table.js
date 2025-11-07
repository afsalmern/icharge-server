"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("rentals", "corporate_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "corporates",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addColumn("rentals", "type", Sequelize.STRING);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("rentals", "corporate_id");
    await queryInterface.removeColumn("rentals", "type");
  },
};
