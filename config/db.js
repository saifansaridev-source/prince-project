const mongoose = require("mongoose");

let cached = global._mongoose || (global._mongoose = { conn: null, promise: null });

/**
 * Cached MongoDB Atlas connection for serverless invocations
 * Reuses existing connection across hot lambdas, preventing connection leaks.
 */
async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing.");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5,
      bufferCommands: false
    }).then(m => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
}

module.exports = connectDB;
