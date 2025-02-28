module.exports = (sequelize, DataTypes) => {
  const Boxes = sequelize.define("boxes", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    location_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "locations",
        key: "id",
      },
      allowNull: false,
    },
    unique_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "maintenance"),
      allowNull: false,
      defaultValue: "active",
    },
    total_powerbanks: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    available_powerbanks: {
      type: DataTypes.INTEGER,
      allowNull: false,
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

  Boxes.associate = (models) => {
    Boxes.belongsTo(models.locations, {
      foreignKey: "location_id",
      as: "location",
    });
  };
  return Boxes;
};
