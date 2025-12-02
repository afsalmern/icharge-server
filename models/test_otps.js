module.exports = (sequelize, DataTypes) => {
  const TestOtps = sequelize.define(
    "test_otps",
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
        type: DataTypes.STRING(10),
        allowNull: false,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return TestOtps;
};
