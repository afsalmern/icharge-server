"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove existing unique constraint (if it exists)
    await queryInterface.removeConstraint("users", "users_email_key");

    // Modify the 'email' column
    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Re-add unique constraint separately
    await queryInterface.addConstraint("users", {
      fields: ["email"],
      type: "unique",
      name: "users_email_unique",
    });

    // Modify the 'name' column
    await queryInterface.changeColumn("users", "name", {
      type: Sequelize.STRING(255),
      allowNull: false,
      defaultValue: "User",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove unique constraint before reverting column changes
    await queryInterface.removeConstraint("users", "users_email_unique");

    // Revert the 'email' column
    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    // Re-add unique constraint
    await queryInterface.addConstraint("users", {
      fields: ["email"],
      type: "unique",
      name: "users_email_key",
    });

    // Revert the 'name' column
    await queryInterface.changeColumn("users", "name", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
