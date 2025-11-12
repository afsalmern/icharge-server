module.exports = (sequelize, DataTypes) => {
  const UserReferels = sequelize.define(
    "user_referels",
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
      referel_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "referel_codes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  UserReferels.associate = (models) => {
    UserReferels.belongsTo(models.users, {
      foreignKey: "user_id",
      as: "user",
    });
    UserReferels.belongsTo(models.referel_codes, {
      foreignKey: "referel_id",
      as: "code",
    });
  };

  return UserReferels;
};
