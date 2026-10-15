import express from "express";
import { requireAuth } from "../middleware/auth.js";
import CheckIn from "../models/CheckIn.js";
import WellbeingGoal from "../models/WellbeingGoal.js";
import WeeklyReport from "../models/WeeklyReport.js";

const router = express.Router();
router.use(requireAuth);

function employeeOnly(req, res, next) {
  if (req.user.role !== "employee") return res.status(403).json({ message: "Personal reports are only available in the Employee Portal" });
  next();
}

function monday(value = new Date()) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function average(items, field) {
  return items.length ? Number((items.reduce((sum, item) => sum + Number(item[field] || 0), 0) / items.length).toFixed(1)) : null;
}

function buildMetrics(checkins, goals, previousCheckins) {
  const mornings = checkins.filter((item) => item.type === "morning");
  const evenings = checkins.filter((item) => item.type === "evening");
  const completedGoals = goals.filter((goal) => goal.status === "completed" || goal.progress === 100).length;
  const currentScore = average(checkins, "wellbeingScore");
  const previousScore = average(previousCheckins, "wellbeingScore");
  return {
    checkinCount: checkins.length,
    morningCount: mornings.length,
    eveningCount: evenings.length,
    averages: { mood: average(checkins, "mood"), stress: average(checkins, "stress"), workload: average(checkins, "workload"), wellbeingScore: currentScore },
    previousWeekScore: previousScore,
    scoreChange: currentScore !== null && previousScore !== null ? Number((currentScore - previousScore).toFixed(1)) : null,
    morningEvening: {
      morning: { mood: average(mornings, "mood"), stress: average(mornings, "stress"), workload: average(mornings, "workload") },
      evening: { mood: average(evenings, "mood"), stress: average(evenings, "stress"), workload: average(evenings, "workload") }
    },
    plannedOvertimeHours: Number(evenings.reduce((sum, item) => sum + Number(item.plannedOvertimeHours || 0), 0).toFixed(1)),
    goalProgress: { total: goals.length, completed: completedGoals, average: average(goals, "progress") || 0 },
    sufficientData: checkins.length >= 2,
    summary: checkins.length < 2 ? "There is not enough recorded data for a reliable weekly pattern yet." : `You completed ${mornings.length} morning and ${evenings.length} evening check-ins. This summary reflects your self-reported entries only.`,
    suggestion: checkins.length < 2 ? "Try a few more check-ins to build a useful personal pattern." : average(checkins, "stress") >= 4 ? "Consider planning a recovery break or discussing workload support early." : "Keep noticing the routines that support your workday and wellbeing."
  };
}

router.get("/weeks", employeeOnly, async (req, res, next) => {
  try {
    const dates = await CheckIn.distinct("shiftDate", { user: req.user._id, shiftDate: { $type: "string" } });
    const weeks = [...new Set(dates.map(monday))].sort().reverse();
    res.json({ weeks });
  } catch (error) { next(error); }
});

router.get("/weekly", employeeOnly, async (req, res, next) => {
  try {
    const weekStart = monday(req.query.start || new Date().toISOString().slice(0, 10));
    const weekEnd = addDays(weekStart, 7);
    const previousStart = addDays(weekStart, -7);
    const [checkins, previousCheckins, goals] = await Promise.all([
      CheckIn.find({ user: req.user._id, shiftDate: { $gte: weekStart, $lt: weekEnd } }).sort({ shiftDate: 1 }).lean(),
      CheckIn.find({ user: req.user._id, shiftDate: { $gte: previousStart, $lt: weekStart } }).lean(),
      WellbeingGoal.find({ user: req.user._id }).lean()
    ]);
    const metrics = buildMetrics(checkins, goals, previousCheckins);
    await WeeklyReport.findOneAndUpdate({ user: req.user._id, weekStart }, { metrics, generatedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.json({ weekStart, weekEnd: addDays(weekStart, 6), metrics });
  } catch (error) { next(error); }
});

export default router;
