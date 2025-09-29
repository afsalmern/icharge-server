module.exports = (sequelize, DataTypes) => {
  const RentalOtp = sequelize.define(
    "rental_otps",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      otp: {
        type: DataTypes.INTEGER,
        allowNull: false,
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

      location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "locations", // Ensure 'users' table exists before migrating
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      box_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "boxes", // Ensure 'users' table exists before migrating
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return RentalOtp;
};
