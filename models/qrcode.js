"use strict";

module.exports = (sequelize, DataTypes) => {
  const QRCode = sequelize.define(
    "qr_codes",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      device_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "boxes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      code: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  // Define associations
  QRCode.associate = (models) => {
    QRCode.belongsTo(models.boxes, {
      foreignKey: "device_id",
      as: "device",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return QRCode;
};
