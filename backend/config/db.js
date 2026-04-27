const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false, // Set to true if you want to see SQL queries in console
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false, // Set to false to fix "self-signed certificate" error
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Connected to Aiven...');
  } catch (err) {
    console.error('❌ Unable to connect to the database:', err.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
