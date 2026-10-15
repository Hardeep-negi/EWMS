import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const DEPARTMENTS = ["Development", "Marketing", "Sales"];

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing. Add it to server/.env.");
  }
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, department, jobTitle, phone, portal } = req.body;
    const role = portal === "hr" ? "hr" : "employee";
    if (!name || !email || !password || !department || !phone) {
      return res.status(400).json({ message: "Name, email, phone, password, and department are required" });
    }
    if (!DEPARTMENTS.includes(department)) return res.status(400).json({ message: "Choose a valid department" });
    if (role === "employee" && !jobTitle?.trim()) return res.status(400).json({ message: "Job title is required for employee accounts" });
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "An account already exists for this email" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normalizedEmail, passwordHash, department, jobTitle: role === "employee" ? jobTitle : "", phone, role });
    res.status(201).json({ message: "Sign up successful. Please log in.", user: user.toSafeJSON() });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password, department, portal } = req.body;
    if (!email || !password || !department || !portal) {
      return res.status(400).json({ message: "Email, password, department, and portal are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });
    if (user.department !== department) return res.status(403).json({ message: "The selected department does not match this account" });
    if (portal === "hr" && user.role !== "hr" && user.role !== "admin") return res.status(403).json({ message: "Use the Employee Portal for this account" });
    if (portal === "employee" && user.role !== "employee") return res.status(403).json({ message: "Use the HR Portal for this account" });
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (error) {
    next(error);
  }
});

export default router;
