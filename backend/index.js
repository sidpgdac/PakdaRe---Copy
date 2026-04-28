const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();
const { sequelize, connectDB } = require('./config/db');
const logger = require('./utils/logger');
const swaggerSpecs = require('./config/swagger');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

// Initialize Express
const app = express();
let server; // module-level ref for graceful shutdown

// Rate Limiting (Security Shield)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 login attempts per 15 min per IP
  message: 'Too many login attempts. Please wait 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Connect to Database
const startServer = async () => {
  try {
    await connectDB(); 
    
    // NEVER use { alter: true } in production — it locks tables causing full downtime.
    // In dev: sync creates missing tables. In production: use `npx sequelize-cli db:migrate`
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ force: false }); // safe: only creates, never alters
      logger.info('✅ Database models synchronized (dev mode)');
    } else {
      logger.info('✅ Production: skipping auto-sync — use migrations');
    }

    // Middleware
    // Security headers (helmet) with Content-Security-Policy
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'"],
          styleSrc:   ["'self'", "'unsafe-inline'"],
          imgSrc:     ["'self'", 'data:', 'https://res.cloudinary.com'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // allow image embedding from cloudinary
    }));
  // Security: Restrict CORS to known origins only
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, same-server)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
    },
    credentials: true,
  }));
    app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    
    // ── Gzip Compression (reduces response size by 60-80%) ──
    app.use(compression({ level: 6, threshold: 1024 })); // compress responses > 1KB

    // Apply rate limiting to all routes
    app.use('/api/', limiter);

    // Swagger API Docs — only in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
    }

    // Routes (auth gets stricter rate limiting)
    app.use('/api/auth', authLimiter, authRoutes);
    app.use('/api/complaints', complaintRoutes);

    app.use('/', (req, res) => {
      res.json({ message: 'PakdaRe Backend API is running...', docs: '/api-docs' });
    });

    // Global Error Handler (Audit Trail)
    app.use((err, req, res, next) => {
      logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      res.status(err.status || 500).json({
        success: false,
        message: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
      });
    });

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      if (process.send) process.send('ready'); // PM2 wait_ready signal
    });
  } catch (error) {
    logger.error('Failed to start server: %s', error.message);
  }
};

startServer();

// ── Graceful Shutdown (drain in-flight requests before closing) ──
// Critical for zero-downtime deploys with PM2 cluster mode
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server?.close(() => {
    logger.info('HTTP server closed. Draining DB pool...');
    sequelize.close().then(() => {
      logger.info('DB pool closed. Exiting cleanly.');
      process.exit(0);
    });
  });
  // Force exit if graceful shutdown takes too long
  setTimeout(() => { process.exit(1); }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // PM2 restart signal
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));  // Ctrl+C
process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error('💥 Unhandled Rejection:', reason);
});
