'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column exists first to avoid errors if user already tried fixing it
    const tableInfo = await queryInterface.describeTable('promo_codes');
    if (!tableInfo.send_whatsapp) {
      await queryInterface.addColumn('promo_codes', 'send_whatsapp', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('promo_codes', 'send_whatsapp');
  }
};
