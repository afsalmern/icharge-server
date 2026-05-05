module.exports = (sequelize, DataTypes) => {
  const Package = sequelize.define(
    "packages",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      hourly_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      swap: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      type: {
        type: DataTypes.ENUM("hourly", "daily", "weekly", "monthly", "free"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return Package;
};
