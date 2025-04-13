const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("./auth");
const { connectRedis } = require("./config/redis");
const connectDB = require("./config/database");
const { generalLimiter, authLimiter, verificationLimiter, securityMiddleware } = require("./middleware/security");
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

// Apply security middleware first
app.use(securityMiddleware);

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api/verify', verificationLimiter);
app.use('/api', generalLimiter);

// Body parsing middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Middleware
app.use(
  cors({
    origin: function(origin, callback) {
      const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "https://rideshare-frontend.vercel.app"];
      // Allow requests with no origin (like mobile apps or curl requests)
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
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/verify", verificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/issues", issuesRoutes); 
app.use("/api/bug-reports", bugReportRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Connect to MongoDB and start server
connectDB()
  .then(async () => {
    // Initialize Redis connection
    await connectRedis();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error during startup:", err);
    process.exit(1);
  });
