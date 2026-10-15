import express from "express";
import { requireAuth } from "../middleware/auth.js";
import Concern from "../models/Concern.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const concerns = await Concern.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ concerns });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { category, urgency, message, anonymous } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    if (req.user.role !== "employee") return res.status(403).json({ message: "Only employees can submit concerns" });
    const concern = await Concern.create({
      user: req.user._id,
      anonymous: Boolean(anonymous),
      category,
      urgency,
      message
    });

    res.status(201).json({ message: "Concern submitted privately.", concern });
  } catch (error) {
    next(error);
  }
});

export default router;
