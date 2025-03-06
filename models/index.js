'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const config = require('../config/config.js')[process.env.NODE_ENV || 'development'];

const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(config.database, config.username, config.password, config);

const db = {};

fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') && file !== path.basename(__filename))
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach(model => {
  if (model.associate) model.associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
