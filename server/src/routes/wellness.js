import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import WellnessEvent from "../models/WellnessEvent.js";
import EventRegistration from "../models/EventRegistration.js";

const router = express.Router();
router.use(requireAuth);

function safeEvent(event, registrationCount = 0, registration = null) {
  return { id: event._id, title: event.title, description: event.description, department: event.department, startsAt: event.startsAt, durationMinutes: event.durationMinutes, venue: event.venue, registrationDeadline: event.registrationDeadline, capacity: event.capacity, status: event.status, registrationCount, registrationStatus: registration?.status || null, createdAt: event.createdAt };
}

async function eventsWithRegistrations(department, employeeId = null) {
  const events = await WellnessEvent.find({ department }).sort({ startsAt: 1 }).lean();
  const registrations = await EventRegistration.find({ event: { $in: events.map((event) => event._id) } }).lean();
  const counts = new Map(); const mine = new Map();
  for (const registration of registrations) {
    if (registration.status === "registered") counts.set(String(registration.event), (counts.get(String(registration.event)) || 0) + 1);
    if (employeeId && String(registration.employee) === String(employeeId)) mine.set(String(registration.event), registration);
  }
  return events.map((event) => safeEvent(event, counts.get(String(event._id)) || 0, mine.get(String(event._id))));
}

router.get("/events", async (req, res, next) => {
  try { res.json({ events: await eventsWithRegistrations(req.user.department, req.user.role === "employee" ? req.user._id : null) }); } catch (error) { next(error); }
});

router.post("/events/:eventId/register", requireRole("employee"), async (req, res, next) => {
  try {
    const event = await WellnessEvent.findOne({ _id: req.params.eventId, department: req.user.department, status: "scheduled" });
    if (!event) return res.status(404).json({ message: "Wellness event not found" });
    if (event.startsAt <= new Date()) return res.status(400).json({ message: "This event has already started" });
    if (event.registrationDeadline && event.registrationDeadline < new Date()) return res.status(400).json({ message: "Registration has closed" });
    const registered = await EventRegistration.countDocuments({ event: event._id, status: "registered" });
    if (event.capacity && registered >= event.capacity) return res.status(400).json({ message: "This event is full" });
    const registration = await EventRegistration.findOneAndUpdate({ event: event._id, employee: req.user._id }, { status: "registered" }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.status(201).json({ registration: { id: registration._id, status: registration.status } });
  } catch (error) { next(error); }
});

router.delete("/events/:eventId/register", requireRole("employee"), async (req, res, next) => {
  try {
    const event = await WellnessEvent.findOne({ _id: req.params.eventId, department: req.user.department });
    if (!event) return res.status(404).json({ message: "Wellness event not found" });
    await EventRegistration.findOneAndUpdate({ event: event._id, employee: req.user._id }, { status: "cancelled" });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.use(requireRole("hr", "admin"));

router.post("/events", async (req, res, next) => {
  try {
    const { title, description, startsAt, durationMinutes, venue, registrationDeadline, capacity } = req.body;
    if (!title?.trim() || !startsAt || !Number.isFinite(Number(durationMinutes))) return res.status(400).json({ message: "Title, date and duration are required" });
    const event = await WellnessEvent.create({ title, description, department: req.user.department, startsAt, durationMinutes: Number(durationMinutes), venue, organizer: req.user._id, registrationDeadline: registrationDeadline || null, capacity: capacity ? Number(capacity) : null });
    res.status(201).json({ event: safeEvent(event) });
  } catch (error) { next(error); }
});

router.patch("/events/:eventId", async (req, res, next) => {
  try {
    const event = await WellnessEvent.findOne({ _id: req.params.eventId, department: req.user.department });
    if (!event) return res.status(404).json({ message: "Wellness event not found" });
    for (const key of ["title", "description", "startsAt", "durationMinutes", "venue", "registrationDeadline", "capacity", "status"]) if (req.body[key] !== undefined) event[key] = req.body[key];
    await event.save();
    res.json({ event: safeEvent(event) });
  } catch (error) { next(error); }
});

export default router;
