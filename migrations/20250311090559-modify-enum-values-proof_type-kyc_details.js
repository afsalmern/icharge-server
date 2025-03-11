module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1️⃣ Temporarily change column type to STRING to detach ENUM dependency
    await queryInterface.changeColumn("kyc_details", "proof_type", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // 2️⃣ Drop the existing ENUM type
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_kyc_details_proof_type\";");

    // 3️⃣ Add the new ENUM type with updated values
    await queryInterface.changeColumn("kyc_details", "proof_type", {
      type: Sequelize.ENUM("aadhar", "driving_license"),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: Convert column to STRING first to avoid ENUM dependency
    await queryInterface.changeColumn("kyc_details", "proof_type", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Restore the old ENUM type
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_kyc_details_proof_type\";");

    await queryInterface.changeColumn("kyc_details", "proof_type", {
      type: Sequelize.ENUM("passport", "driver_license", "national_id"),
      allowNull: false,
    });
  },
};
