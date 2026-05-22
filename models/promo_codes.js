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
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      discount_type: {
        type: DataTypes.ENUM("percentage", "fixed"),
        allowNull: false,
        defaultValue: "percentage",
      },
      discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      valid_from: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      valid_until: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      max_usage: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      usage_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      send_whatsapp: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      applies_to: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Comma-separated chips/categories the code applies to",
      },
      watti_template_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Watti template name to use for this promo code",
      },
    },
    {
      timestamps: true,
      underscored: true,
      paranoid: true,
    }
  );

  PromoCode.associate = (models) => {
    // associations can be defined here
  };

  return PromoCode;
};
