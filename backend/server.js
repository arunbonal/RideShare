const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const morgan = require('morgan');
const passport = require("./auth");
const { connectRedis } = require("./config/redis");
const connectDB = require("./config/database");
const { generalLimiter, authLimiter, verificationLimiter, securityMiddleware } = require("./middleware/security");
const { logger, stream } = require("./config/logger");
const { metricsMiddleware, metrics } = require("./config/metrics");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const rideRoutes = require("./routes/ride");
const verificationRoutes = require("./routes/verification");
const adminRoutes = require("./routes/admin");
const issuesRoutes = require("./routes/issues");
const bugReportRoutes = require("./routes/bugReports");
const uuid = require('uuid');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - required when running behind a reverse proxy like Render
app.set('trust proxy', 1);

// Apply metrics middleware first
app.use(metricsMiddleware);

// Request logging
app.use(morgan('combined', { stream }));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security headers
app.use(helmet());
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.frameguard({ action: 'deny' }));

// CORS configuration with specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  ['https://rideshare-frontend.vercel.app'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Apply security middleware
app.use(securityMiddleware);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Apply rate limiters directly to route handlers
const authRouter = express.Router();
authRouter.use(authLimiter);
authRouter.use('/', authRoutes);
app.use("/api/auth", authRouter);

const verifyRouter = express.Router();
verifyRouter.use(verificationLimiter);
verifyRouter.use('/', verificationRoutes);
app.use("/api/verify", verifyRouter);

// Apply general limiter to other routes
app.use("/api/profile", generalLimiter, profileRoutes);
app.use("/api/rides", generalLimiter, rideRoutes);
app.use("/api/admin", generalLimiter, adminRoutes);
app.use("/api/issues", generalLimiter, issuesRoutes);
app.use("/api/bug-reports", generalLimiter, bugReportRoutes);

// Metrics endpoint - protected and only enabled in development
if (process.env.NODE_ENV !== 'production') {
    app.get('/metrics', (req, res) => {
        res.set('Content-Type', client.register.contentType);
        client.register.metrics().then(data => res.send(data));
    });
}

// Root route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "RideShare Backend API",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Health check route - no rate limit
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Add request ID middleware
app.use((req, res, next) => {
  req.id = uuid.v4();
  next();
});

// Enhanced logging middleware
app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    requestId: req.id,
    userAgent: tokens['user-agent'](req, res),
    responseTime: tokens['response-time'](req, res),
    timestamp: new Date().toISOString()
  });
}, { stream: { write: message => logger.info(message) } }));

// Connect to MongoDB and start server
connectDB()
  .then(async () => {
    // Initialize Redis connection
    await connectRedis();
    
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("Error during startup:", err);
    process.exit(1);
  });
