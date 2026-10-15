import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import checkinRoutes from "./routes/checkins.js";
import concernRoutes from "./routes/concerns.js";
import userRoutes from "./routes/user.js";
import goalRoutes from "./routes/goals.js";
import reportRoutes from "./routes/reports.js";
import hrRoutes from "./routes/hr.js";
import supportRoutes from "./routes/support.js";
import wellnessRoutes from "./routes/wellness.js";
import feedbackRoutes from "./routes/feedback.js";

const app = express();

const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173"
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  }
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "employee-wellbeing-api",
    database: {
      connected: mongoose.connection.readyState === 1,
      name: mongoose.connection.name || null
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/concerns", concernRoutes);
app.use("/api/user", userRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/wellness", wellnessRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

export default app;
