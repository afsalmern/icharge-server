module.exports = (sequelize, DataTypes) => {
  const Rentals = sequelize.define("rentals", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "users",
        key: "id",
      },
      allowNull: true,
    },
    box_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "boxes",
        key: "id",
      },
      allowNull: true,
    },
    package_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "packages",
        key: "id",
      },
      allowNull: true,
    },
    return_location_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "locations",
        key: "id",
      },
      allowNull: true,
    },
    start_time: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    end_time: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    return_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    extra_hours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("ongoing", "completed", "overdue"),
      allowNull: false,
    },
    extra_charge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  });

  return Rentals;
};
