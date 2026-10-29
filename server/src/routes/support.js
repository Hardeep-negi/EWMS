import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import User from "../models/User.js";
import Concern from "../models/Concern.js";
import SupportAction from "../models/SupportAction.js";

const router = express.Router();
router.use(requireAuth);

function safeAction(action) {
  return { id: action._id, employee: action.employee, concern: action.concern, type: action.type, title: action.title, description: action.description, assignedPerson: action.assignedPerson, followUpAt: action.followUpAt, employeeConsented: action.employeeConsented, outcome: action.outcome, meetingAt: action.meetingAt, leaveDecision: action.leaveDecision, status: action.status, employeeDismissed: action.employeeDismissed, employeeMessage: action.employeeMessage, createdAt: action.createdAt };
}

router.get("/mine", async (req, res, next) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ message: "Employee support updates only" });
    const actions = await SupportAction.find({ employee: req.user._id, employeeDismissed: false }).sort({ createdAt: -1 }).lean();
    res.json({ actions: actions.map(safeAction) });
  } catch (error) { next(error); }
});

router.patch("/mine/:actionId/dismiss", async (req, res, next) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ message: "Employee support updates only" });
    const action = await SupportAction.findOne({ _id: req.params.actionId, employee: req.user._id });
    if (!action) return res.status(404).json({ message: "Support action not found" });
    if (action.status !== "completed" && action.status !== "closed") return res.status(400).json({ message: "Only completed support updates can be removed" });
    action.employeeDismissed = true;
    await action.save();
    res.json({ action: safeAction(action) });
  } catch (error) { next(error); }
});

router.use(requireRole("hr"));

router.get("/", async (req, res, next) => {
  try {
    const actions = await SupportAction.find({ department: req.user.department }).populate("employee", "name jobTitle").sort({ updatedAt: -1 }).lean();
    res.json({ actions: actions.map(safeAction) });
  } catch (error) { next(error); }
});

router.get("/concerns", async (req, res, next) => {
  try {
    const employees = await User.find({ role: "employee", department: req.user.department }).select("_id name jobTitle").lean();
    const byId = new Map(employees.map((employee) => [String(employee._id), employee]));
    const concerns = await Concern.find({ user: { $in: employees.map((employee) => employee._id) }, anonymous: false, status: { $ne: "resolved" } }).sort({ createdAt: -1 }).lean();
    res.json({ concerns: concerns.map((concern) => ({ id: concern._id, employee: byId.get(String(concern.user)), category: concern.category, urgency: concern.urgency, status: concern.status, createdAt: concern.createdAt })) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { employeeId, concernId, type, title, description, assignedPerson, followUpAt, employeeConsented, outcome, meetingAt, leaveDecision, status, employeeMessage } = req.body;
    if (!employeeId || !title?.trim() || !["support-person", "meeting", "leave"].includes(type)) return res.status(400).json({ message: "Employee, action type, and title are required" });
    const employee = await User.findOne({ _id: employeeId, role: "employee", department: req.user.department });
    if (!employee) return res.status(404).json({ message: "Employee not found in your department" });
    if (type === "meeting" && !meetingAt) return res.status(400).json({ message: "Choose a meeting date and time" });
    if (type === "leave" && !["approved", "declined", "pending"].includes(leaveDecision)) return res.status(400).json({ message: "Choose a leave decision" });
    let concern = null;
    if (concernId) {
      concern = await Concern.findOne({ _id: concernId, user: employee._id, anonymous: false });
      if (!concern) return res.status(400).json({ message: "That identified concern is not available for this employee" });
    }
    const action = await SupportAction.create({ employee: employee._id, concern: concern?._id, department: req.user.department, createdBy: req.user._id, type, title, description, assignedPerson, followUpAt: followUpAt || null, employeeConsented: employeeConsented !== false, outcome, meetingAt: meetingAt || null, leaveDecision: type === "leave" ? leaveDecision : "not-applicable", status: status || "open", employeeMessage });
    if (concern) { concern.status = action.status === "completed" ? "resolved" : "action-planned"; await concern.save(); }
    res.status(201).json({ action: safeAction(action) });
  } catch (error) { next(error); }
});

router.patch("/:actionId", async (req, res, next) => {
  try {
    const action = await SupportAction.findOne({ _id: req.params.actionId, department: req.user.department });
    if (!action) return res.status(404).json({ message: "Support action not found" });
    const allowed = ["title", "description", "assignedPerson", "followUpAt", "employeeConsented", "outcome", "meetingAt", "leaveDecision", "status", "employeeMessage"];
    for (const key of allowed) if (req.body[key] !== undefined) action[key] = req.body[key];
    await action.save();
    if (action.concern) await Concern.findByIdAndUpdate(action.concern, { status: action.status === "completed" ? "resolved" : "action-planned" });
    res.json({ action: safeAction(action) });
  } catch (error) { next(error); }
});

export default router;
