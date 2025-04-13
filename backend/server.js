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
require("dotenv").config();

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

// CORS configuration
app.use(
  cors({
    origin: function(origin, callback) {
      const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "https://rideshare-frontend.vercel.app"];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

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

// Health check route - no rate limit
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', { 
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

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
