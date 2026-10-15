import mongoose from "mongoose";

const supportActionSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  concern: { type: mongoose.Schema.Types.ObjectId, ref: "Concern", default: null },
  department: { type: String, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["support-person", "meeting", "leave"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 1500, default: "" },
  assignedPerson: { type: String, trim: true, maxlength: 120, default: "" },
  followUpAt: { type: Date, default: null },
  employeeConsented: { type: Boolean, default: true },
  outcome: { type: String, trim: true, maxlength: 1200, default: "" },
  meetingAt: { type: Date, default: null },
  leaveDecision: { type: String, enum: ["pending", "approved", "declined", "not-applicable"], default: "not-applicable" },
  status: { type: String, enum: ["open", "in-progress", "awaiting-employee", "completed", "closed"], default: "open" },
  employeeDismissed: { type: Boolean, default: false },
  employeeMessage: { type: String, trim: true, maxlength: 800, default: "" }
}, { timestamps: true });

export default mongoose.model("SupportAction", supportActionSchema);
