module.exports = (sequelize, DataTypes) => {
  const Advertisements = sequelize.define(
    "advertisements",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      type: {
        type: DataTypes.ENUM("image", "video"),
        allowNull: false,
      },
      file: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      underscored: true,
      timestamps: true,
    }
  );

  return Advertisements;
};
