import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Super Admins do not collect a phone number during registration. Employee
    // and HR records still require one, preserving the existing profile flow.
    phone: { type: String, required() { return this.role !== "super-admin"; }, trim: true, default: "" },
    role: { type: String, enum: ["employee", "hr", "super-admin"], default: "employee" },
    department: { type: String, enum: ["Development", "Marketing", "Sales"], required: true },
    jobTitle: { type: String, default: "", trim: true },
    accessStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    emailVerified: { type: Boolean, default: true },
    emailOtpHash: { type: String, default: null, select: false },
    emailOtpExpiresAt: { type: Date, default: null, select: false },
    emailOtpAttempts: { type: Number, default: 0, select: false },
    emailOtpSentAt: { type: Date, default: null, select: false },
    shift: {
      timezone: { type: String, default: "Asia/Kolkata" },
      startMinutes: { type: Number, min: 0, max: 1439, default: 540 },
      endMinutes: { type: Number, min: 1, max: 1440, default: 1020 },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] }
    },
    reminderPreferences: {
      enabled: { type: Boolean, default: true },
      intervalMinutes: { type: Number, min: 30, max: 180, default: 75 },
      breakEnabled: { type: Boolean, default: true },
      waterEnabled: { type: Boolean, default: true },
      stretchEnabled: { type: Boolean, default: true },
      lastShownAt: { type: Date, default: null },
      snoozedUntil: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, department: 1 }, { unique: true, partialFilterExpression: { role: "super-admin", emailVerified: true } });

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
    shift: this.shift,
    reminderPreferences: this.reminderPreferences
  };
};

export default mongoose.model("User", userSchema);
