'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameTable('otp', 'otps');
  },

  async down (queryInterface, Sequelize) {
   await queryInterface.renameTable('otps', 'otp');
  }
};
