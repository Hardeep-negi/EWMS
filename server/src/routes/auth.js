import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import SuperAdminReservation from "../models/SuperAdminReservation.js";
import { sendVerificationCode } from "../utils/email.js";

const router = express.Router();
const DEPARTMENTS = ["Development", "Marketing", "Sales"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const otpHash = (email, code) => crypto.createHash("sha256").update(`${email}:${code}:${process.env.JWT_SECRET}`).digest("hex");
const code6 = () => crypto.randomInt(0, 1000000).toString().padStart(6, "0");
const otpRequests = new Map();
function otpRateLimit(req, res, next) {
  const key = `${req.ip}:${String(req.body.email || "").trim().toLowerCase()}`;
  const now = Date.now();
  const recent = (otpRequests.get(key) || []).filter((time) => now - time < 15 * 60_000);
  if (recent.length >= 5) return res.status(429).json({ message: "Too many code requests. Try again in 15 minutes." });
  recent.push(now); otpRequests.set(key, recent); next();
}
function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing. Add it to server/.env.");
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
async function issueOtp(user) {
  const code = code6();
  user.emailOtpHash = otpHash(user.email, code);
  user.emailOtpExpiresAt = new Date(Date.now() + 5 * 60_000);
  user.emailOtpAttempts = 0;
  user.emailOtpSentAt = new Date();
  await user.save();
  // Do not make account creation wait on an external SMTP connection. The
  // verification screen can open immediately, while delivery is retried via
  // the normal resend flow if Gmail is temporarily slow or unavailable.
  void sendVerificationCode(user.email, code).catch((error) => {
    console.error("OTP email delivery failed:", error.message);
  });
  return user.emailOtpExpiresAt;
}
async function removeUnverifiedRegistration(user) {
  if (!user) return;
  await User.deleteOne({ _id: user._id, emailVerified: false });
  await SuperAdminReservation.deleteOne({ user: user._id });
}

router.post("/signup", async (req, res, next) => {
  let user;
  try {
    const { name, email, password, department, jobTitle, phone, portal } = req.body;
    const role = portal === "hr" ? "hr" : "employee";
    if (!name || !email || !password || !department || !phone || !emailPattern.test(email.trim())) return res.status(400).json({ message: "Name, valid email, phone, password, and department are required" });
    if (!DEPARTMENTS.includes(department)) return res.status(400).json({ message: "Choose a valid department" });
    if (role === "employee" && !jobTitle?.trim()) return res.status(400).json({ message: "Job title is required for employee accounts" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "Unable to create an account with these details. Try logging in or use a different email." });
    user = await User.create({ name, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 10), department, jobTitle: role === "employee" ? jobTitle : "", phone, role, accessStatus: role === "hr" ? "pending" : "approved", emailVerified: role === "hr" });
    if (role === "employee") {
      const otpExpiresAt = await issueOtp(user);
      return res.status(201).json({ verificationRequired: true, email: user.email, otpExpiresAt, message: "Check your email for a six-digit verification code." });
    }
    res.status(201).json({ message: "HR registration submitted and awaiting Super Admin approval." });
  } catch (error) { await removeUnverifiedRegistration(user); next(error); }
});

router.post("/super-admin/signup", async (req, res, next) => {
  let user;
  try {
    const { name, email, password, department } = req.body;
    if (!name || !email || !password || !emailPattern.test(email.trim()) || !DEPARTMENTS.includes(department)) return res.status(400).json({ message: "Name, valid email, password, and department are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    const normalizedEmail = email.trim().toLowerCase();
    const expiredPending = await User.findOne({ email: normalizedEmail, role: "super-admin", emailVerified: false });
    if (expiredPending) {
      const activeReservation = await SuperAdminReservation.exists({ user: expiredPending._id, expiresAt: { $gt: new Date() } });
      if (!activeReservation) await removeUnverifiedRegistration(expiredPending);
    }
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "Unable to create an account with these details. Try logging in or use a different email." });
    await SuperAdminReservation.deleteOne({ department, expiresAt: { $lte: new Date() } });
    if (await User.exists({ role: "super-admin", department, emailVerified: true })) return res.status(409).json({ message: "A Super Admin account already exists for this department. Please log in instead." });
    user = await User.create({ name, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 10), phone: "", department, role: "super-admin", emailVerified: false, accessStatus: "pending" });
    await SuperAdminReservation.create({ department, user: user._id, expiresAt: new Date(Date.now() + 5 * 60_000) });
    const otpExpiresAt = await issueOtp(user);
    res.status(201).json({ verificationRequired: true, email: user.email, otpExpiresAt, message: "Check your email for a six-digit verification code." });
  } catch (error) { await removeUnverifiedRegistration(user); if (error.code === 11000) return res.status(409).json({ message: "A Super Admin registration is already in progress or exists for this department." }); next(error); }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase(); const code = String(req.body.code || "");
    const user = await User.findOne({ email, role: { $in: ["employee", "super-admin"] }, emailVerified: false }).select("+emailOtpHash +emailOtpExpiresAt +emailOtpAttempts");
    if (!user) return res.status(400).json({ message: "This verification code is invalid or has already been used." });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: "Enter the six-digit verification code." });
    if (user.emailOtpAttempts >= 5) return res.status(400).json({ message: "Too many incorrect codes. Request a new code." });
    if (!user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) return res.status(400).json({ message: "This verification code has expired. Request a new code." });
    user.emailOtpAttempts += 1;
    if (user.emailOtpHash !== otpHash(email, code)) { await user.save(); return res.status(400).json({ message: "The verification code is incorrect." }); }
    if (user.role === "super-admin") {
      const reservation = await SuperAdminReservation.exists({ user: user._id, department: user.department, expiresAt: { $gt: new Date() } });
      if (!reservation) return res.status(400).json({ message: "This Super Admin registration has expired. Please register again." });
    }
    user.emailVerified = true; user.emailOtpHash = null; user.emailOtpExpiresAt = null; user.emailOtpAttempts = 0;
    if (user.role === "super-admin") user.accessStatus = "approved";
    await user.save(); await SuperAdminReservation.deleteOne({ user: user._id });
    res.json({ token: signToken(user), user: user.toSafeJSON(), message: "Email verified." });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A verified Super Admin already exists for this department." });
    next(error);
  }
});

router.post("/resend-otp", otpRateLimit, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email, role: { $in: ["employee", "super-admin"] }, emailVerified: false }).select("+emailOtpSentAt");
    if (user) {
      if (user.role === "super-admin" && !(await SuperAdminReservation.exists({ user: user._id, expiresAt: { $gt: new Date() } }))) return res.json({ message: "If the account can receive a code, a new code has been sent." });
      if (user.emailOtpSentAt && Date.now() - user.emailOtpSentAt.getTime() < 60_000) return res.status(429).json({ message: "Please wait one minute before requesting another code." });
      const otpExpiresAt = await issueOtp(user);
      return res.json({ message: "A new code has been sent.", otpExpiresAt });
    }
    res.json({ message: "If the account can receive a code, a new code has been sent." });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password, department, portal } = req.body;
    if (!email || !password || !department || !portal) return res.status(400).json({ message: "Email, password, department, and portal are required" });
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password" });
    if (user.role === "employee" && !user.emailVerified) return res.status(403).json({ message: "Verify your email before logging in." });
    if (user.accessStatus !== "approved") return res.status(403).json({ message: user.accessStatus === "rejected" ? "This HR registration was rejected." : "This account is awaiting Super Admin approval." });
    if (user.department !== department) return res.status(403).json({ message: "The selected department does not match this account" });
    if (portal === "hr" && user.role !== "hr") return res.status(403).json({ message: "Use the correct portal for this account" });
    if (portal === "employee" && user.role !== "employee") return res.status(403).json({ message: "Use the correct portal for this account" });
    if (portal === "super-admin" && user.role !== "super-admin") return res.status(403).json({ message: "Use the correct portal for this account" });
    if (!portal || !["hr", "employee", "super-admin"].includes(portal)) return res.status(400).json({ message: "Choose a valid portal" });
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (error) { next(error); }
});

export default router;
