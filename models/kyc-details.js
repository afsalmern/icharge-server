module.exports = (sequelize, DataTypes) => {
  const KycDetails = sequelize.define(
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
        references: {
          model: "users",
          key: "id",
        },
        allowNull: true,
      },
      full_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      photo: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      proof_type: {
        type: DataTypes.ENUM("aadhar", "passport", "driving_licence"),
        allowNull: false,
      },
      proof_number: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      proof_document: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
      },
      proof_number: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      subbmitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true,
    }
  );

  KycDetails.associate = (models) => {
    KycDetails.belongsTo(models.users, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return KycDetails;
};
