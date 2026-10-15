import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  department: { type: String, enum: ["Development", "Marketing", "Sales"], required: true, index: true },
  category: { type: String, enum: ["Workload", "Work environment", "Management", "Work-life balance", "Wellness programs", "Other"], required: true },
  message: { type: String, trim: true, maxlength: 1500, default: "" }
}, { timestamps: true });

export default mongoose.model("Feedback", feedbackSchema);
