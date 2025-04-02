"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_packages_type" ADD VALUE 'free';`);
  },

  async down(queryInterface, Sequelize) {},
};
