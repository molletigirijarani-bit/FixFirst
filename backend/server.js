require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://fix-first-frontend.vercel.app",
  process.env.CLIENT_URL
].filter(Boolean);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (for example health checks and server-to-server calls).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by FixFirst CORS policy"));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));

// Ensure MongoDB Atlas is connected before any route accesses the database.
// This is required because Vercel may import the Express app without executing
// the local app.listen() startup block below.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection unavailable:", error.message);
    res.status(503).json({
      status: "error",
      message: "Database connection unavailable. Please try again shortly."
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "FixFirst API is running successfully!",
    database: mongoose.connection.readyState === 1
      ? "Connected to MongoDB Atlas"
      : "Not connected",
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/api/repairs", require("./routes/repairRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/providers", require("./routes/providerRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: `API endpoint '${req.originalUrl}' not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);

  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

// Local development startup. On Vercel, the exported Express app is handled
// by the Vercel Node.js runtime and this block is not used.
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`FixFirst server running on port ${PORT}`);
      console.log("MongoDB Atlas connection established.");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
