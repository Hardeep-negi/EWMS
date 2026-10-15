import mongoose from "mongoose";

const hrCheckInSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mood: { type: Number, min: 1, max: 5, required: true },
  stress: { type: Number, min: 1, max: 5, required: true },
  workload: { type: Number, min: 1, max: 5, required: true },
  note: { type: String, trim: true, maxlength: 1000, default: "" }
}, { timestamps: true });

export default mongoose.model("HrCheckIn", hrCheckInSchema);
