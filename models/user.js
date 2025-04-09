module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "users",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "User",
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      dob: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },
      referral_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      avatar: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      mobile: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      deposit_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      outstanding_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      block_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "user",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      device_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      device_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      device_platform: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true, // Converts createdAt → created_at, updatedAt → updated_at
    }
  );

  User.associate = (models) => {
    User.hasMany(models.rentals, {
      foreignKey: "user_id",
      as: "rentals",
    });

    User.hasOne(models.kyc_details, {
      foreignKey: "user_id",
      as: "kyc_details",
    });

    User.hasMany(models.user_transactions, {
      foreignKey: "user_id",
      as: "transactions",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.withdraw_requests, {
      foreignKey: "user_id",
      as: "withdraw_requests",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.complaints, {
      foreignKey: "user_id",
      as: "complaints",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return User;
};