"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn("kyc_details", "proof_document", "proof_front");
    await queryInterface.addColumn("kyc_details", "proof_back", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
   await queryInterface.renameColumn("kyc_details", "proof_front", "proof_document");
    await queryInterface.removeColumn("kyc_details", "proof_back");
  },
};
