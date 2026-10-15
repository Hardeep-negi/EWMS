import mongoose from "mongoose";

const weeklyReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  weekStart: { type: String, required: true },
  metrics: { type: mongoose.Schema.Types.Mixed, required: true },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

weeklyReportSchema.index({ user: 1, weekStart: 1 }, { unique: true });

export default mongoose.model("WeeklyReport", weeklyReportSchema);
