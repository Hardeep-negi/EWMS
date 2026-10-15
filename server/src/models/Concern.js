import mongoose from "mongoose";

const concernSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    anonymous: { type: Boolean, default: true },
    category: { type: String, required: true },
    urgency: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["submitted", "reviewing", "under-review", "action-planned", "resolved"], default: "submitted" }
  },
  { timestamps: true }
);

export default mongoose.model("Concern", concernSchema);
