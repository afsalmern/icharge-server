module.exports = (sequelize, DataTypes) => {
  const PromoCode = sequelize.define(
    "promo_codes",
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
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      promo_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      template_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return PromoCode;
};
