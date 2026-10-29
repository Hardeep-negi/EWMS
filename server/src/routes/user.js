import express from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const jobTitle = String(req.body.jobTitle || "").trim();
    if (!name || !phone || !email) return res.status(400).json({ message: "Name, phone number, and email are required" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address" });
    if (req.user.role === "employee" && !jobTitle) return res.status(400).json({ message: "Job title is required for employee profiles" });
    const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existing) return res.status(409).json({ message: "An account already uses this email address" });
    req.user.name = name;
    req.user.phone = phone;
    req.user.email = email;
    if (req.user.role === "employee") req.user.jobTitle = jobTitle;
    await req.user.save();
    res.json({ user: req.user.toSafeJSON(), message: "Profile details updated" });
  } catch (error) { next(error); }
});

export default router;
