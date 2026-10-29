import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { reminderDefaults, reminderStatus } from "../utils/reminders.js";

const router = express.Router();
router.use(requireAuth, requireRole("employee"));

function preferences(user) { return { ...reminderDefaults, ...(user.reminderPreferences?.toObject?.() || user.reminderPreferences || {}) }; }

router.get("/", (req, res) => {
  res.json(reminderStatus(preferences(req.user), req.user.shift));
});

router.patch("/preferences", async (req, res, next) => {
  try { const current = preferences(req.user); for (const key of ["enabled", "intervalMinutes", "breakEnabled", "waterEnabled", "stretchEnabled"]) if (req.body[key] !== undefined) current[key] = key === "intervalMinutes" ? Math.max(30, Math.min(180, Number(req.body[key]))) : Boolean(req.body[key]); req.user.reminderPreferences = current; await req.user.save(); res.json({ preferences: preferences(req.user) }); } catch (error) { next(error); }
});

router.post("/action", async (req, res, next) => {
  try { const action = req.body.action; if (!["dismiss", "done", "snooze"].includes(action)) return res.status(400).json({ message: "Invalid reminder action" }); req.user.reminderPreferences = { ...preferences(req.user), lastShownAt: new Date(), snoozedUntil: action === "snooze" ? new Date(Date.now() + 15 * 60000) : null }; await req.user.save(); res.status(204).end(); } catch (error) { next(error); }
});

export default router;
