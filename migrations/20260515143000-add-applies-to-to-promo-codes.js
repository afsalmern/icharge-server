'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('promo_codes');
    if (!tableInfo.applies_to) {
      await queryInterface.addColumn('promo_codes', 'applies_to', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Comma-separated chips/categories the code applies to"
      });
    }
    if (!tableInfo.watti_template_name) {
      await queryInterface.addColumn('promo_codes', 'watti_template_name', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Watti template name to use for this promo code"
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('promo_codes', 'applies_to');
    await queryInterface.removeColumn('promo_codes', 'watti_template_name');
  }
};
