"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_kyc_details_status" ADD VALUE 'privilege';`);

    await queryInterface.changeColumn("kyc_details", "status", {
      type: Sequelize.ENUM("pending", "approved", "rejected", "privilege"),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE TYPE "enum_kyc_details_status_new" AS ENUM ('pending', 'approved', 'rejected');`);

    await queryInterface.sequelize.query(
      `ALTER TABLE "kyc_details" ALTER COLUMN "status" TYPE "enum_kyc_details_status_new" USING "status"::text::"enum_kyc_details_status_new";`
    );

    await queryInterface.sequelize.query(`DROP TYPE "enum_kyc_details_status";`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_kyc_details_status_new" RENAME TO "enum_kyc_details_status";`);
  },
};
