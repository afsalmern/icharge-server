module.exports = (sequelize, DataTypes) => {
  const Disputes = sequelize.define(
    "disputes",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      rental_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "rentals", // Ensure 'users' table exists
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true, // Creates created_at, updated_at instead of camelCase
    }
  );

  // Define association with User
  Disputes.associate = (models) => {
    Disputes.belongsTo(models.rentals, {
      foreignKey: "rental_id",
      as: "rental",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Disputes;
};
