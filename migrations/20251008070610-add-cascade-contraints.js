"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Drop the existing foreign key
    await queryInterface.removeConstraint("user_deposits", "user_deposits_user_id_fkey");

    // Step 2: Add the foreign key again with CASCADE
    await queryInterface.addConstraint("user_deposits", {
      fields: ["user_id"],
      type: "foreign key",
      name: "user_deposits_user_id_fkey",
      references: {
        table: "users",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to the previous state (if needed)
    await queryInterface.removeConstraint("user_deposits", "user_deposits_user_id_fkey");

    await queryInterface.addConstraint("user_deposits", {
      fields: ["user_id"],
      type: "foreign key",
      name: "user_deposits_user_id_fkey",
      references: {
        table: "users",
        field: "id",
      },
      onUpdate: "NO ACTION",
      onDelete: "NO ACTION",
    });
  },
};
