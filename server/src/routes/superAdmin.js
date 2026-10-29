import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import User from "../models/User.js";
import CheckIn from "../models/CheckIn.js";
import HrCheckIn from "../models/HrCheckIn.js";

const router = express.Router();
router.use(requireAuth, requireRole("super-admin"));

function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); }
function startOfTodayInIndia() { return new Date(`${today()}T00:00:00+05:30`); }
function safeUser(user) { return { id: user._id, name: user.name, email: user.email, phone: user.phone, department: user.department, jobTitle: user.jobTitle, accessStatus: user.accessStatus }; }

router.get("/dashboard", async (req, res, next) => {
  try {
    const department = req.user.department;
    const [employees, hrs, pendingHr, hrIds] = await Promise.all([
      User.countDocuments({ department, role: "employee" }),
      User.countDocuments({ department, role: "hr" }),
      User.countDocuments({ department, role: "hr", accessStatus: "pending" }),
      User.find({ department, role: "hr", accessStatus: "approved" }).distinct("_id")
    ]);
    const hrCheckins = await HrCheckIn.find({ user: { $in: hrIds }, createdAt: { $gte: startOfTodayInIndia() } }).select("user").lean();
    const checkedIn = new Set(hrCheckins.map((item) => String(item.user))).size;
    res.json({ department, employees, hrs, pendingHr, hrCheckedIn: checkedIn, hrNotCheckedIn: Math.max(0, hrIds.length - checkedIn) });
  } catch (error) { next(error); }
});

router.get("/hr", async (req, res, next) => {
  try {
    const people = await User.find({ department: req.user.department, role: "hr" }).select("name email phone department role accessStatus").sort({ name: 1 }).lean();
    const ids = people.filter((item) => item.accessStatus === "approved").map((item) => item._id);
    const logs = await HrCheckIn.find({ user: { $in: ids }, createdAt: { $gte: startOfTodayInIndia() } }).distinct("user");
    const checked = new Set(logs.map(String));
    res.json({ hr: people.map((item) => ({ ...safeUser(item), checkin: item.accessStatus === "approved" ? checked.has(String(item._id)) ? "Recorded" : "Not recorded" : "Not available" })) });
  } catch (error) { next(error); }
});

router.get("/employees", async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim();
    const filter = { department: req.user.department, role: "employee" };
    if (query) filter.$or = [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }];
    const people = await User.find(filter).select("name email phone department jobTitle emailVerified accessStatus").sort({ name: 1 }).lean();
    const ids = people.map((item) => item._id);
    const records = await CheckIn.find({ user: { $in: ids } }).sort({ shiftDate: -1, createdAt: -1 }).lean();
    const latest = new Map(); const checkedToday = new Set();
    for (const item of records) { const id = String(item.user); if (!latest.has(id)) latest.set(id, item); if (item.shiftDate === today()) checkedToday.add(id); }
    res.json({ employees: people.map((person) => { const record = latest.get(String(person._id)); return { ...safeUser(person), wellbeingScore: record?.wellbeingScore ?? null, checkinStatus: checkedToday.has(String(person._id)) ? "Checked in" : "Not checked in", emailVerified: person.emailVerified, accessStatus: person.accessStatus }; }) });
  } catch (error) { next(error); }
});

router.patch("/hr/:id/approve", async (req, res, next) => {
  try {
    const person = await User.findOneAndUpdate({ _id: req.params.id, department: req.user.department, role: "hr", accessStatus: "pending" }, { $set: { accessStatus: "approved" } }, { new: true });
    if (!person) return res.status(404).json({ message: "Pending HR registration not found in your department" });
    res.json({ user: safeUser(person), message: "HR account approved." });
  } catch (error) { next(error); }
});

router.patch("/hr/:id/reject", async (req, res, next) => {
  try {
    const person = await User.findOneAndUpdate({ _id: req.params.id, department: req.user.department, role: "hr", accessStatus: "pending" }, { $set: { accessStatus: "rejected" } }, { new: true });
    if (!person) return res.status(404).json({ message: "Pending HR registration not found in your department" });
    res.json({ user: safeUser(person), message: "HR account rejected." });
  } catch (error) { next(error); }
});

export default router;
