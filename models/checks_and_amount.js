module.exports = (sequelize, DataTypes) => {
  const ChecksAndAmounts = sequelize.define(
    "checks_and_amounts",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      is_kyc_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_deposit_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deposit_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      }
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return ChecksAndAmounts;
};