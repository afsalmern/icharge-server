"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn("user_referels", "createdAt", "created_at");
    await queryInterface.renameColumn("user_referels", "updatedAt", "updated_at");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn("user_referels", "created_at", "createdAt");
    await queryInterface.renameColumn("user_referels", "updated_at", "updatedAt");
  },
};
