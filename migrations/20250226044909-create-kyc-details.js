"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "kyc_details",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        full_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        photo: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        proof_type: {
          type: Sequelize.ENUM("aadhar", "passport", "driving_licence"),
          allowNull: false,
        },
        proof_number: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        proof_document: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM("pending", "approved", "rejected"),
          allowNull: false,
        },
        proof_number: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        subbmitted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        verified_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        timestamps: true,
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("kyc_details");
  },
};
