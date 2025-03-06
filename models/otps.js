module.exports = (sequelize, DataTypes) => {
  const Otps = sequelize.define(
    "otps",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      mobile: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      otp: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return Otps;
};
