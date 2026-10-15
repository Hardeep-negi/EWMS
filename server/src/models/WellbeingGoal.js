import mongoose from "mongoose";

const wellbeingGoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  target: { type: String, trim: true, maxlength: 240, default: "" },
  startDate: { type: String, required: true },
  targetDate: { type: String, required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ["not-started", "in-progress", "completed", "paused"], default: "not-started" },
  sharedWithHR: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("WellbeingGoal", wellbeingGoalSchema);
