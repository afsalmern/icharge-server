module.exports = (sequelize, DataTypes) => {
  const Payments = sequelize.define("payments", {
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
    amount:{
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_method:{
      type: DataTypes.ENUM('credit card','debit card','upi','wallet','cash'),
      allowNull: false,
      defaultValue: 'cash',
    },
    status:{
      type: DataTypes.ENUM('success','pending','failed'),
      allowNull: false,
      defaultValue: 'pending',
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

  Payments.associate = (models) => {};

  return Payments;
};
