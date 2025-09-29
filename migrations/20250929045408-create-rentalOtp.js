"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("rental_otps", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      otp: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "locations", // Ensure 'users' table exists before migrating
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      box_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "boxes", // Ensure 'users' table exists before migrating
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("rental_otps");
  },
};
