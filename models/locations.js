"use strict";

module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define(
    "locations",
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
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
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
        type: DataTypes.TEXT,
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
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  Location.associate = function (models) {
    Location.hasMany(models.boxes, {
      foreignKey: "location_id",
      as: "boxes",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Location;
};
