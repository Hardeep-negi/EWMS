import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ["employee", "hr", "admin"], default: "employee" },
    department: { type: String, enum: ["Development", "Marketing", "Sales"], required: true },
    jobTitle: { type: String, default: "", trim: true },
    accessStatus: { type: String, enum: ["pending", "approved"], default: "approved" },
    shift: {
      timezone: { type: String, default: "Asia/Kolkata" },
      startMinutes: { type: Number, min: 0, max: 1439, default: 540 },
      endMinutes: { type: Number, min: 1, max: 1440, default: 1020 },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] }
    }
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    department: this.department,
    jobTitle: this.jobTitle,
    accessStatus: this.accessStatus,
    shift: this.shift
  };
};

export default mongoose.model("User", userSchema);
