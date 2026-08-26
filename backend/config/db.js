const mongoose = require("mongoose");

/**
 * Connect to MongoDB.
 * Uses MONGODB_URI from .env. If connection fails (or USE_MEMORY_DB=true),
 * falls back to mongodb-memory-server so the app still runs for demos/classwork.
 */
const connectDB = async () => {
  const useMemory = process.env.USE_MEMORY_DB === "true";

  if (!useMemory && process.env.MONGODB_URI) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(
        `Could not connect to ${process.env.MONGODB_URI} — starting in-memory MongoDB instead.`
      );
      console.warn(`Reason: ${error.message}`);
    }
  }

  // In-memory fallback (no local mongod required)
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const conn = await mongoose.connect(uri);
  console.log(`In-memory MongoDB ready: ${conn.connection.host}`);
  console.log("(Data resets when the server stops. Install MongoDB or set MONGODB_URI for persistence.)");
};

module.exports = connectDB;
