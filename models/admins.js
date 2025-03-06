const bcrypt = require("bcrypt");
module.exports = (sequelize, DataTypes) => {
  const Admins = sequelize.define(
    "admins",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "admin",
      },
    },
    {
      timestamps: true,
      underscored: true, // Creates created_at, updated_at instead of camelCase
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    }
  );

  Admins.prototype.validPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
  };

  return Admins;
};
