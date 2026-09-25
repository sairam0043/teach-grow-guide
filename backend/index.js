if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const tutorRoutes = require('./routes/tutorRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

const app = express();
app.set('trust proxy', 1);

// Lightweight request duration logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Allow multiple origins (comma-separated in FRONTEND_URL); in development allow any origin so LAN IP works
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:8080')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (allowedOrigins.length === 0) allowedOrigins.push('http://localhost:8080');

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: (origin, cb) => {
    // No origin (e.g. same-origin, Postman) or allowed list
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    // In development, allow any origin so http://192.168.x.x:8080 works
    if (!isProduction) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-skip-network-alert', 'x-requested-with', 'Accept', 'Origin']
}));
app.use(express.json());

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Connection event listeners for auto-recovery
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection dropped, resetting cache.');
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Runtime connection error:', err.message);
  if (mongoose.connection.readyState === 0) {
    cached.conn = null;
    cached.promise = null;
  }
});

const connectDB = async (retries = 2) => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 15000, // 15s buffer for replica discovery & TLS handshake
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4,                      // Force IPv4 to prevent IPv6 DNS/TLS handshake errors
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!cached.promise) {
        cached.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
          return mongooseInstance;
        });
      }
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (e) {
      console.error(`[MongoDB] Connection attempt ${attempt} failed: ${e.message}`);
      cached.conn = null;
      cached.promise = null;
      if (attempt < retries) {
        // Wait 300ms before retrying transient TLS/handshake failures
        await new Promise(r => setTimeout(r, 300));
      } else {
        throw e;
      }
    }
  }
};

// Middleware to ensure DB connection is established for serverless environments (Vercel)
if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    // Skip database check for lightweight static/health routes
    if (req.path === '/api/health' || req.path === '/') {
      return next();
    }
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error('[Vercel] Database connection failed in serverless handler:', err);
      res.status(500).json({
        error: 'Database connection temporarily unavailable',
        details: err.message
      });
    }
  });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/tutors', tutorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'cuvasol-backend' });
});

app.get('/', (req, res) => {
  res.send('Cuvasol Tutor - Backend with Mongoose');
});

// Traditional/local setup: connect and start server (if not on Vercel)
if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      console.log('Connected to MongoDB');
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'undefined'})`);
      });
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB during startup', err);
    });
}

module.exports = app;

