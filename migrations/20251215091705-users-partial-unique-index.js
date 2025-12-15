"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1️⃣ Drop existing UNIQUE constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
    `);

    // 2️⃣ Create partial unique index for email
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX users_email_unique_active
      ON users (email)
      WHERE deleted_at IS NULL;
    `);

    // 3️⃣ Create partial unique index for mobile
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX users_mobile_unique_active
      ON users (mobile)
      WHERE deleted_at IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Rollback partial indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS users_email_unique_active;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS users_mobile_unique_active;
    `);

    // Restore original UNIQUE constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_email_unique UNIQUE (email);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_phone_key UNIQUE (mobile);
    `);
  },
};
