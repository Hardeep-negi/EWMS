import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
  department: { type: String, enum: ["Development", "Marketing", "Sales"], required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

export default mongoose.model("SuperAdminReservation", reservationSchema);
