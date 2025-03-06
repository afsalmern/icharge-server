module.exports = (sequelize, DataTypes) => {
  const Rental = sequelize.define(
    "rentals",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      box_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "boxes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      package_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "packages",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      return_time: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      return_location_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "locations",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      extra_hours: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM("ongoing", "completed", "overdue"),
        allowNull: false,
        defaultValue: "ongoing",
      },
      extra_charge: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return Rental;
};
