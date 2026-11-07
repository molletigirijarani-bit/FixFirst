
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true
  })
);

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "FixFirst API is running successfully!",
    database: "Local MongoDB",
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

// Start server
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`FixFirst server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

// Start the HTTP server only when this file is executed directly.
// This keeps the Express app safe to import from the isolated test suite.
if (require.main === module) {
  startServer();
}

module.exports = app;
