"use strict";

module.exports = (sequelize, DataTypes) => {
  const UserTransactions = sequelize.define(
    "user_transactions",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
      status: {
        type: DataTypes.ENUM("transferred", "recieved"),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      transfer_status: {
        type: DataTypes.ENUM("pending", "success", "failed"),
        allowNull: true,
        defaultValue: "pending",
      },
      withdrawal_status: {
        type: DataTypes.ENUM("pending", "success", "failed"),
        allowNull: true,
        defaultValue: "pending",
      },
      transaction_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  UserTransactions.associate = (models) => {
    UserTransactions.belongsTo(models.users, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return UserTransactions;
};
