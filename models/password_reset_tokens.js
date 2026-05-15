module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define(
    "password_reset_tokens",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  PasswordResetToken.associate = (models) => {
    PasswordResetToken.belongsTo(models.admins, { foreignKey: "admin_id" });
  };

  return PasswordResetToken;
};
