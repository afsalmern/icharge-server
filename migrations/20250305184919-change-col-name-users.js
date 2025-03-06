'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
   await queryInterface.renameColumn('users', 'phone', 'mobile');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn('users', 'mobile', 'phone');
  }
};
