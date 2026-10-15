import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Feedback from "../models/Feedback.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", requireRole("employee"), async (req, res, next) => {
  try {
    const { category, message } = req.body;
    if (!category) return res.status(400).json({ message: "Choose a feedback category" });
    const feedback = await Feedback.create({ department: req.user.department, category, message });
    res.status(201).json({ feedback: { id: feedback._id, category: feedback.category, createdAt: feedback.createdAt } });
  } catch (error) { next(error); }
});

router.get("/analysis", requireRole("hr", "admin"), async (req, res, next) => {
  try {
    const minimumGroupSize = 3;
    const feedback = await Feedback.find({ department: req.user.department }).sort({ createdAt: 1 }).lean();
    if (feedback.length < minimumGroupSize) return res.json({ suppressed: true, minimumGroupSize, count: feedback.length, categories: [], trends: [] });
    const categories = new Map(); const trends = new Map();
    for (const item of feedback) {
      categories.set(item.category, (categories.get(item.category) || 0) + 1);
      const month = item.createdAt.toISOString().slice(0, 7);
      trends.set(month, (trends.get(month) || 0) + 1);
    }
    res.json({ suppressed: false, minimumGroupSize, count: feedback.length, categories: [...categories.entries()].map(([label, count]) => ({ label, count })), trends: [...trends.entries()].map(([month, count]) => ({ month, count })) });
  } catch (error) { next(error); }
});

export default router;
