module.exports = (sequelize, DataTypes) => {
  const Complaint = sequelize.define(
    "complaints",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      issue_type: {
        type: DataTypes.ENUM("device_not_working", "battery_drain", "physical_damage", "charging_issue", "other"),
        allowNull: true,
      },
      attachment: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      ticket_no: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM("open", "in_progress", "resolved", "closed"),
        allowNull: false,
        defaultValue: "open",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users", // Referencing the users table
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  // Define associations
  Complaint.associate = (models) => {
    Complaint.belongsTo(models.users, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Complaint;
};
