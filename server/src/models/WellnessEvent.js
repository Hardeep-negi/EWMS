import mongoose from "mongoose";

const wellnessEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 1500, default: "" },
  department: { type: String, enum: ["Development", "Marketing", "Sales"], required: true, index: true },
  startsAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, required: true, min: 15, max: 1440 },
  venue: { type: String, trim: true, maxlength: 240, default: "" },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  registrationDeadline: { type: Date, default: null },
  capacity: { type: Number, min: 1, max: 10000, default: null },
  status: { type: String, enum: ["scheduled", "cancelled"], default: "scheduled" }
}, { timestamps: true });

export default mongoose.model("WellnessEvent", wellnessEventSchema);
