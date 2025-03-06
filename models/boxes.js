"use strict";

module.exports = (sequelize, DataTypes) => {
  const Box = sequelize.define(
    "boxes",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "locations", // Refers to the locations table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "maintenance"),
        allowNull: false,
        defaultValue: "active",
      },
      unique_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      total_powerbanks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      available_powerbanks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  // Define associations
  Box.associate = (models) => {
    Box.belongsTo(models.locations, {
      foreignKey: "location_id",
      as: "location",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Box.hasMany(models.rentals, {
      foreignKey: "box_id",
      as: "rentals",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Box;
};
