module.exports = (sequelize, DataTypes) => {
  const WattiMedia = sequelize.define(
    "watti_media",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      file_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      file_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return WattiMedia;
};
