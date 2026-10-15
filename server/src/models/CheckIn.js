import mongoose from "mongoose";

const checkInSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["morning", "evening"], default: "morning", required: true },
    shiftDate: { type: String, required: true },
    checkInAt: { type: Date, default: null },
    plannedOvertime: { type: Boolean, default: false },
    plannedOvertimeHours: { type: Number, min: 0, max: 12, default: 0 },
    expectedCompensation: { type: Number, min: 0, default: 0 },
    mood: { type: Number, min: 1, max: 5, required: true },
    stress: { type: Number, min: 1, max: 5, required: true },
    workload: { type: Number, min: 1, max: 5, required: true },
    overtimeHours: { type: Number, min: 0, default: 0 },
    leaveDays: { type: Number, min: 0, default: 0 },
    comment: { type: String, default: "", trim: true },
    wellbeingScore: { type: Number, min: 0, max: 100, required: true },
    riskLevel: { type: String, enum: ["healthy", "watch", "at-risk"], required: true },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

checkInSchema.index(
  { user: 1, shiftDate: 1, type: 1 },
  { unique: true, partialFilterExpression: { shiftDate: { $type: "string" } } }
);

export default mongoose.model("CheckIn", checkInSchema);
