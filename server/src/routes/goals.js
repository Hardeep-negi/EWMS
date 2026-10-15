import express from "express";
import { requireAuth } from "../middleware/auth.js";
import WellbeingGoal from "../models/WellbeingGoal.js";

const router = express.Router();
router.use(requireAuth);

function employeeOnly(req, res, next) {
  if (req.user.role !== "employee") return res.status(403).json({ message: "Goals are private to employee accounts" });
  next();
}

function validGoal(body) {
  const progress = Number(body.progress ?? 0);
  if (!body.title?.trim() || !body.startDate || !body.targetDate) return "Title, start date, and target date are required";
  if (body.targetDate < body.startDate) return "Target date must be on or after the start date";
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) return "Progress must be between 0 and 100";
  return null;
}

router.get("/", employeeOnly, async (req, res, next) => {
  try { res.json({ goals: await WellbeingGoal.find({ user: req.user._id }).sort({ targetDate: 1, createdAt: -1 }).lean() }); }
  catch (error) { next(error); }
});

router.post("/", employeeOnly, async (req, res, next) => {
  try {
    const issue = validGoal(req.body); if (issue) return res.status(400).json({ message: issue });
    const goal = await WellbeingGoal.create({ ...req.body, user: req.user._id, progress: Number(req.body.progress || 0), sharedWithHR: false });
    res.status(201).json({ goal });
  } catch (error) { next(error); }
});

router.patch("/:goalId", employeeOnly, async (req, res, next) => {
  try {
    const existing = await WellbeingGoal.findOne({ _id: req.params.goalId, user: req.user._id });
    if (!existing) return res.status(404).json({ message: "Goal not found" });
    const merged = { ...existing.toObject(), ...req.body };
    const issue = validGoal(merged); if (issue) return res.status(400).json({ message: issue });
    Object.assign(existing, req.body, { progress: Number(req.body.progress ?? existing.progress) });
    if (existing.progress === 100 && existing.status !== "paused") existing.status = "completed";
    await existing.save();
    res.json({ goal: existing });
  } catch (error) { next(error); }
});

export default router;
