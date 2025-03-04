module.exports = (sequelize, DataTypes) => {
  const Packages = sequelize.define(
    "packages",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      swap: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("hourly", "weekly", "monthly"),
        allowNull: false,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  Packages.associate = (models) => {};

  return Packages;
};
