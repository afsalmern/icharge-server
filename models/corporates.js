module.exports = (sequelize, DataTypes) => {
  const Corporates = sequelize.define(
    "corporates",
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
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
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

  Corporates.associate = function (models) {
    Corporates.hasMany(models.boxes, {
      foreignKey: "corporate_id",
      as: "boxes",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Corporates;
};
