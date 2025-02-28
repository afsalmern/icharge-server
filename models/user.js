module.exports = (sequelize, DataTypes) => {
  const Users = sequelize.define("users", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    username: {
      type: DataTypes.STRING(50),
      defaultValue: "User",
    },
    status:{
      type: DataTypes.ENUM("active","inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    block_status:{
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true,
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: " https://www.w3schools.com/howto/img_avatar.png",
    },
    dob: {
      type: DataTypes.STRING(12),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "user",
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deposit_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    outstanding_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
  });

  Users.associate = (models) => {
    Users.hasOne(models.kyc_details, { foreignKey: "user_id", as: "kyc_details" });
  };

  return Users;
};
