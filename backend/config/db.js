const mongoose = require("mongoose");

let connectionPromise;

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error("MONGO_URI is missing. Add it to backend/.env locally and to Vercel Environment Variables.");
  }

  // Reuse an established connection in local development and warm Vercel instances.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Reuse an in-flight connection attempt to avoid opening multiple connections
  // when Vercel handles concurrent requests in the same instance.
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoURI, {
        serverSelectionTimeoutMS: 10000
      })
      .then(() => {
        console.log(
          `MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`
        );
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error("MongoDB connection error:", error.message);
        throw error;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;
