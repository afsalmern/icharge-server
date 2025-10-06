module.exports = (sequelize, DataTypes) => {
  const RentalPayment = sequelize.define(
    "rental_payments",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      rental_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "rentals", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "success", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      order_id: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      timestamps: false,
      underscored: true,
    }
  );

  RentalPayment.associate = (models) => {
    RentalPayment.belongsTo(models.rentals, { foreignKey: "rental_id", as: "rental" });
    RentalPayment.belongsTo(models.users, { foreignKey: "user_id", as: "user" });
  };

  return RentalPayment;
};
