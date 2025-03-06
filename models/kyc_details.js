module.exports = (sequelize, DataTypes) => {
  const KycDetail = sequelize.define(
    "kyc_details",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users", // Ensure 'users' table exists
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      full_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      photo: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      proof_type: {
        type: DataTypes.ENUM("passport", "driver_license", "national_id"),
        allowNull: false,
      },
      proof_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      proof_document: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "verified", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true, // Creates created_at, updated_at instead of camelCase
    }
  );

  // Define association with User
  KycDetail.associate = (models) => {
    KycDetail.belongsTo(models.users, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return KycDetail;
};
