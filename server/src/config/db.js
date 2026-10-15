import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is missing. Copy server/.env.example to server/.env.");
  }
  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000
  });
  console.log(`MongoDB connected: ${connection.connection.name}`);
  return connection;
}
