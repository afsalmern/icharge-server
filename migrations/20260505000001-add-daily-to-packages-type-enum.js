"use strict";

module.exports = {
  async up(queryInterface) {
    // PostgreSQL allows adding enum values safely without touching existing data
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_packages_type" ADD VALUE IF NOT EXISTS 'daily';`
    );
  },

  async down(queryInterface) {
    // PostgreSQL does not support removing enum values without recreating the type.
    // Leaving this as a no-op to avoid data loss.
  },
};
