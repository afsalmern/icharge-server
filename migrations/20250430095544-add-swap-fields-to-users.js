// migrations/YYYYMMDDHHMMSS-add-swap-fields-to-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "swaps_used", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("users", "swaps_remaining", {
      type: Sequelize.INTEGER,
      allowNull: true, // null for unlimited (monthly plans)
      defaultValue: 0,
    });
    await queryInterface.addColumn("users", "can_swap", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("users", "swaps_used");
    await queryInterface.removeColumn("users", "swaps_remaining");
    await queryInterface.removeColumn("users", "can_swap");
  },
};
