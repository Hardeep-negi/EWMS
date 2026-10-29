import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Feedback from "../models/Feedback.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", requireRole("employee"), async (req, res, next) => {
  try {
    const { category, message, anonymous = true } = req.body;
    if (!category) return res.status(400).json({ message: "Choose a feedback category" });
    const isAnonymous = anonymous !== false;
    const feedback = await Feedback.create({ department: req.user.department, category, message, anonymous: isAnonymous, user: isAnonymous ? null : req.user._id });
    res.status(201).json({ feedback: { id: feedback._id, category: feedback.category, anonymous: feedback.anonymous, createdAt: feedback.createdAt } });
  } catch (error) { next(error); }
});

router.get("/analysis", requireRole("hr"), async (req, res, next) => {
  try {
    const minimumGroupSize = 3;
    const feedback = await Feedback.find({ department: req.user.department }).populate("user", "name department jobTitle").sort({ createdAt: 1 }).lean();
    const anonymousItems = feedback.filter((item) => item.anonymous !== false);
    const knownItems = feedback.filter((item) => item.anonymous === false && item.user);
    const categories = new Map(); const trends = new Map();
    for (const item of anonymousItems) {
      categories.set(item.category, (categories.get(item.category) || 0) + 1);
      const month = item.createdAt.toISOString().slice(0, 7);
      trends.set(month, (trends.get(month) || 0) + 1);
    }
    const categoryIndex = (category) => ["Workload", "Work environment", "Management", "Work-life balance", "Wellness programs", "Other"].indexOf(category) + 1;
    const scatter = (items) => items.map((item, index) => ({ x: index + 1, y: categoryIndex(item.category), category: item.category, submittedAt: item.createdAt }));
    const categoryCounts = (items) => {
      const counts = new Map();
      for (const item of items) counts.set(item.category, (counts.get(item.category) || 0) + 1);
      return [...counts.entries()].map(([label, count]) => ({ label, count }));
    };
    res.json({
      minimumGroupSize,
      anonymous: { suppressed: anonymousItems.length < minimumGroupSize, count: anonymousItems.length, categories: [...categories.entries()].map(([label, count]) => ({ label, count })), trends: [...trends.entries()].map(([month, count]) => ({ month, count })), points: anonymousItems.length < minimumGroupSize ? [] : scatter(anonymousItems) },
      known: { count: knownItems.length, categories: categoryCounts(knownItems), points: scatter(knownItems), submissions: knownItems.map((item) => ({ id: item._id, category: item.category, message: item.message, createdAt: item.createdAt, employee: { name: item.user.name, department: item.user.department, role: item.user.jobTitle || "Employee" } })) }
    });
  } catch (error) { next(error); }
});

export default router;
