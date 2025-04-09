"use strict";

module.exports = (sequelize, DataTypes) => {
  const PowerBank = sequelize.define(
    "powerbanks",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      box_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "boxes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      unique_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true, // maps to powerNo
      },
      status: {
        type: DataTypes.ENUM("available", "rented", "charging", "maintenance", "lost"),
        allowNull: false,
        defaultValue: "available",
      },
      battery_level: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100.0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      health_status: {
        type: DataTypes.ENUM("good", "degraded", "needs_replacement"),
        allowNull: false,
        defaultValue: "good",
      },
      slot_number: {
        type: DataTypes.INTEGER,
        allowNull: true, // positionUuid
      },
      last_back_time: {
        type: DataTypes.DATE,
        allowNull: true, // backTime
      },
      last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true, // when you last synced this record
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  PowerBank.associate = (models) => {
    PowerBank.belongsTo(models.boxes, {
      foreignKey: "box_id",
      as: "box",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    PowerBank.hasMany(models.rentals, {
      foreignKey: "powerbank_id",
      as: "rentals",
    });

    // models/powerbanks.js

    PowerBank.afterCreate(async (powerbank, options) => {
      if (powerbank.status === "available" && powerbank.box_id) {
        await sequelize.models.boxes.increment("available_powerbanks", {
          by: 1,
          where: { id: powerbank.box_id },
        });
      }
    });

    PowerBank.afterUpdate(async (powerbank, options) => {
      if (!powerbank._previousDataValues) return;

      const prevStatus = powerbank._previousDataValues.status;
      const newStatus = powerbank.status;

      const prevBoxId = powerbank._previousDataValues.box_id;
      const newBoxId = powerbank.box_id;

      // Adjust for status change
      if (prevStatus !== newStatus && powerbank.box_id) {
        if (prevStatus === "available" && newStatus !== "available") {
          await sequelize.models.boxes.decrement("available_powerbanks", {
            by: 1,
            where: { id: powerbank.box_id },
          });
        } else if (prevStatus !== "available" && newStatus === "available") {
          await sequelize.models.boxes.increment("available_powerbanks", {
            by: 1,
            where: { id: powerbank.box_id },
          });
        }
      }

      // Adjust for box change
      if (prevBoxId !== newBoxId) {
        if (prevStatus === "available" && prevBoxId) {
          await sequelize.models.boxes.decrement("available_powerbanks", {
            by: 1,
            where: { id: prevBoxId },
          });
        }

        if (newStatus === "available" && newBoxId) {
          await sequelize.models.boxes.increment("available_powerbanks", {
            by: 1,
            where: { id: newBoxId },
          });
        }
      }
    });

    PowerBank.afterDestroy(async (powerbank, options) => {
      if (powerbank.status === "available" && powerbank.box_id) {
        await sequelize.models.boxes.decrement("available_powerbanks", {
          by: 1,
          where: { id: powerbank.box_id },
        });
      }
    });
  };

  return PowerBank;
};
