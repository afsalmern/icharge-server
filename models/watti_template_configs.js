module.exports = (sequelize, DataTypes) => {
  const WattiTemplateConfig = sequelize.define(
    "watti_template_configs",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      template_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      broadcast_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      body_mappings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return WattiTemplateConfig;
};
