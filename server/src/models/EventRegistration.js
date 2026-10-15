import mongoose from "mongoose";

const eventRegistrationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "WellnessEvent", required: true, index: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["registered", "cancelled"], default: "registered" }
}, { timestamps: true });

eventRegistrationSchema.index({ event: 1, employee: 1 }, { unique: true });

export default mongoose.model("EventRegistration", eventRegistrationSchema);
