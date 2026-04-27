const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const { sequelize, connectDB } = require('./config/db');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

// Initialize Express
const app = express();

// Connect to Database
const startServer = async () => {
  try {
    await connectDB(); // Aiven connection is ready in .env
    
    // Sync models to database (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/complaints', complaintRoutes);

    app.use('/', (req, res) => {
      res.json({ message: 'PakdaRe Backend API is running...' });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
