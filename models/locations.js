'use strict';

module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define('locations', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    starting_hour: {
      type: DataTypes.TIME,
      allowNull: false
    },
    ending_hour: {
      type: DataTypes.TIME,
      allowNull: false
    },
  }, {
    timestamps: true,
    underscored: true
  });

  return Location;
};
