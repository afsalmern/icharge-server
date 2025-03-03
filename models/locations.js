module.exports = (sequelize, DataTypes) => {
  const Locations = sequelize.define("locations", {
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
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    starting_hour: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    ending_hour: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  Locations.associate = (models) => {
    Locations.hasOne(models.boxes, {
      foreignKey: "location_id",
      as: "boxes",
    });
  };

  return Locations;
};
