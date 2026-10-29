import express from "express";
import { requireAuth } from "../middleware/auth.js";
import CheckIn from "../models/CheckIn.js";
import { calculateWellbeingScore } from "../utils/score.js";
import { clockStatus, getShiftWindow } from "../utils/shift.js";

const router = express.Router();
router.use(requireAuth);

function employeeOnly(req, res, next) {
  if (req.user.role !== "employee") return res.status(403).json({ message: "Employee check-ins are only available in the Employee Portal" });
  next();
}

router.get("/", employeeOnly, async (req, res, next) => {
  try {
    const checkins = await CheckIn.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60).lean();
    res.json({ checkins });
  } catch (error) {
    next(error);
  }
});

router.get("/status", employeeOnly, async (req, res, next) => {
  try {
    const shift = getShiftWindow(req.user.shift);
    const [morning, evening] = await Promise.all([
      CheckIn.findOne({ user: req.user._id, shiftDate: shift.shiftDate, type: "morning" }).lean(),
      CheckIn.findOne({ user: req.user._id, shiftDate: shift.shiftDate, type: "evening" }).lean()
    ]);
    res.json({ status: clockStatus(morning, evening, req.user.shift) });
  } catch (error) {
    next(error);
  }
});

router.post("/", employeeOnly, async (req, res, next) => {
  try {
    const { mood, stress, workload, comment, type = "morning", plannedOvertime, plannedOvertimeHours, expectedCompensation } = req.body;
    if (!["morning", "evening"].includes(type)) return res.status(400).json({ message: "Check-in type must be morning or evening" });
    const ratings = [mood, stress, workload].map(Number);
    if (ratings.some((rating) => !Number.isFinite(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ message: "Mood, stress, and workload must be between 1 and 5" });
    }
    const overtimeHours = Number(plannedOvertimeHours || 0);
    const compensation = Number(expectedCompensation || 0);
    if (!Number.isFinite(overtimeHours) || overtimeHours < 0 || overtimeHours > 12 || !Number.isFinite(compensation) || compensation < 0) {
      return res.status(400).json({ message: "Enter valid planned overtime and compensation values" });
    }

    const shift = getShiftWindow(req.user.shift);
    const duplicate = await CheckIn.exists({ user: req.user._id, shiftDate: shift.shiftDate, type });
    if (duplicate) return res.status(409).json({ message: `Today's ${type} check-in has already been completed` });

    const scored = calculateWellbeingScore({ mood, stress, workload, overtimeHours: type === "evening" ? overtimeHours : 0 });
    const checkin = await CheckIn.create({
      user: req.user._id,
      type,
      shiftDate: shift.shiftDate,
      // This is the server-recorded submission timestamp for either check-in.
      // The shift clock deliberately reads it only from the morning record.
      checkInAt: new Date(),
      mood: Number(mood), stress: Number(stress), workload: Number(workload),
      plannedOvertime: type === "evening" ? Boolean(plannedOvertime) : false,
      plannedOvertimeHours: type === "evening" && plannedOvertime ? overtimeHours : 0,
      expectedCompensation: type === "evening" && plannedOvertime ? compensation : 0,
      comment: String(comment || "").slice(0, 1000),
      ...scored
    });
    res.status(201).json({ checkin, message: `${type === "morning" ? "Morning" : "Evening"} check-in saved` });
  } catch (error) {
    next(error);
  }
});

export default router;
