const { Sequelize } = require('sequelize');
require('dotenv').config();

// Primary (write) connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: { rejectUnauthorized: false },
      connectTimeout: 10000,
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,  // was 5 — handles 20x concurrent queries
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: 15000,  // fail fast — was 30000 (too slow)
      idle: 10000,
      evict: 1000,     // check for idle connections every 1s
    },
    retry: {
      max: 3,  // retry failed queries up to 3 times
    },
  }
);

const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('✅ MySQL Connected to Aiven...');
      return;
    } catch (err) {
      retries--;
      console.error(`❌ DB connection failed (${retries} retries left):`, err.message);
      if (retries === 0) {
        console.error('💥 Could not connect to database. Exiting.');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 3000)); // wait 3s before retry
    }
  }
};

module.exports = { sequelize, connectDB };
