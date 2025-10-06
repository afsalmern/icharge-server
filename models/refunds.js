module.exports = (sequelize, DataTypes) => {
  const Refunds = sequelize.define(
    "refunds",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      order_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING, // e.g., "initiated", "completed", "failed"
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING, // optional, e.g., "auto_refund", "manual_refund"
        allowNull: true,
      },
    },
    {
      timestamps: true, // createdAt / updatedAt
      underscored: true,
    }
  );

  return Refunds;
};
