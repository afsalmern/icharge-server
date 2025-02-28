"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("rentals", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "users",
          key: "id",
        },
        allowNull: true,
      },
      box_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "boxes",
          key: "id",
        },
        allowNull: true,
      },
      package_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "packages",
          key: "id",
        },
        allowNull: true,
      },
      return_location_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "locations",
          key: "id",
        },
        allowNull: true,
      },
      start_time: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      end_time: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      return_time: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      extra_hours: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("ongoing", "completed", "overdue"),
        allowNull: false,
      },
      extra_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("rentals");
  },
};
