import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import User from "../models/User.js";
import CheckIn from "../models/CheckIn.js";
import HrCheckIn from "../models/HrCheckIn.js";
import SupportAction from "../models/SupportAction.js";
import Concern from "../models/Concern.js";

const router = express.Router();
router.use(requireAuth, requireRole("hr"));

function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); }
function average(items, field) { return items.length ? Number((items.reduce((sum, item) => sum + Number(item[field] || 0), 0) / items.length).toFixed(1)) : null; }

async function departmentEmployees(department) {
  return User.find({ role: "employee", department }).select("name email phone department jobTitle shift").lean();
}

function safeCheckin(checkin) {
  if (!checkin) return null;
  return { id: checkin._id, type: checkin.type, shiftDate: checkin.shiftDate, createdAt: checkin.createdAt, checkInAt: checkin.checkInAt || checkin.createdAt, mood: checkin.mood, stress: checkin.stress, workload: checkin.workload, wellbeingScore: checkin.wellbeingScore, scoreVersion: checkin.scoreVersion || "v1", riskLevel: checkin.riskLevel, plannedOvertimeHours: checkin.plannedOvertimeHours || 0 };
}

function trendBucket(checkin, range) {
  const date = checkin.shiftDate;
  if (range === "daily") return date;
  if (range === "monthly") return `${date.slice(0, 7)}-01`;
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

function supportStatusFor(employeeId, latestCheckin, actionsByEmployee, openConcernByEmployee) {
  const actions = actionsByEmployee.get(String(employeeId)) || [];
  const openConcern = openConcernByEmployee.get(String(employeeId));
  if (actions.some((action) => !["completed", "closed"].includes(action.status))) return "support-provided";
  const latestCompleted = actions.filter((action) => ["completed", "closed"].includes(action.status)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
  if (openConcern && (!latestCompleted || new Date(openConcern.createdAt) > new Date(latestCompleted.updatedAt))) return "offer-support";
  if (latestCompleted) return "steady";
  if (openConcern) return "offer-support";
  return latestCheckin && (latestCheckin.wellbeingScore < 70 || latestCheckin.stress >= 4) ? "offer-support" : "steady";
}

async function openConcernMap(employeeIds) {
  const concerns = await Concern.find({ user: { $in: employeeIds }, anonymous: false, status: { $ne: "resolved" } }).select("user createdAt").sort({ createdAt: -1 }).lean();
  const byEmployee = new Map();
  for (const concern of concerns) if (!byEmployee.has(String(concern.user))) byEmployee.set(String(concern.user), concern);
  return byEmployee;
}

router.get("/overview", async (req, res, next) => {
  try {
    const employees = await departmentEmployees(req.user.department);
    const ids = employees.map((employee) => employee._id);
    const checkins = await CheckIn.find({ user: { $in: ids } }).sort({ createdAt: -1 }).limit(Math.max(ids.length * 12, 60)).lean();
    const [supportActions, openConcernByEmployee] = await Promise.all([
      SupportAction.find({ employee: { $in: ids } }).select("employee status updatedAt").lean(),
      openConcernMap(ids)
    ]);
    const actionsByEmployee = new Map();
    for (const action of supportActions) { const key = String(action.employee); if (!actionsByEmployee.has(key)) actionsByEmployee.set(key, []); actionsByEmployee.get(key).push(action); }
    const latest = new Map(); const todayMorning = new Set(); const currentDate = today();
    for (const checkin of checkins) {
      const id = String(checkin.user);
      if (!latest.has(id)) latest.set(id, checkin);
      if (checkin.shiftDate === currentDate && checkin.type === "morning") todayMorning.add(id);
    }
    const employeesWithStatus = employees.map((employee) => {
      const last = latest.get(String(employee._id));
      const supportStatus = supportStatusFor(employee._id, last, actionsByEmployee, openConcernByEmployee);
      return { id: employee._id, name: employee.name, department: employee.department, jobTitle: employee.jobTitle, latest: safeCheckin(last), missingCheckIn: !todayMorning.has(String(employee._id)), needsSupport: supportStatus === "offer-support", supportStatus };
    });
    const support = employeesWithStatus.filter((employee) => employee.needsSupport || employee.missingCheckIn || employee.supportStatus === "support-provided");
    res.json({ department: req.user.department, employeeCount: employees.length, support, recent: employeesWithStatus.slice(0, 8), policy: "Support flags use recent self-reported stress, workload, and score thresholds. They prompt a supportive conversation, never an automated employment decision." });
  } catch (error) { next(error); }
});

router.get("/employees", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 10));
    const query = String(req.query.q || "").trim(); const status = String(req.query.status || "all");
    const filter = { role: "employee", department: req.user.department };
    if (query) filter.$or = [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }];
    const all = await User.find(filter).select("name email phone department jobTitle").sort({ name: 1 }).lean();
    const ids = all.map((employee) => employee._id);
    const checkins = await CheckIn.find({ user: { $in: ids } }).sort({ createdAt: -1 }).lean();
    const [supportActions, openConcernByEmployee] = await Promise.all([
      SupportAction.find({ employee: { $in: ids } }).select("employee status updatedAt").lean(),
      openConcernMap(ids)
    ]);
    const actionsByEmployee = new Map();
    for (const action of supportActions) { const key = String(action.employee); if (!actionsByEmployee.has(key)) actionsByEmployee.set(key, []); actionsByEmployee.get(key).push(action); }
    const latest = new Map(); for (const checkin of checkins) if (!latest.has(String(checkin.user))) latest.set(String(checkin.user), checkin);
    const rows = all.map((employee) => { const last = latest.get(String(employee._id)); const supportStatus = supportStatusFor(employee._id, last, actionsByEmployee, openConcernByEmployee); return { id: employee._id, name: employee.name, email: employee.email, phone: employee.phone, department: employee.department, jobTitle: employee.jobTitle, latest: safeCheckin(last), supportStatus }; }).filter((employee) => status === "all" || employee.supportStatus === status);
    res.json({ employees: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, pages: Math.max(1, Math.ceil(rows.length / limit)) });
  } catch (error) { next(error); }
});

router.get("/employees/:employeeId", async (req, res, next) => {
  try {
    const employee = await User.findOne({ _id: req.params.employeeId, role: "employee", department: req.user.department }).select("name email phone department jobTitle").lean();
    if (!employee) return res.status(404).json({ message: "Employee not found in your department" });
    const checkins = await CheckIn.find({ user: employee._id }).sort({ shiftDate: -1, type: 1 }).limit(30).lean();
    res.json({ employee: { ...employee, id: employee._id }, checkins: checkins.map(safeCheckin) });
  } catch (error) { next(error); }
});

router.get("/trends", async (req, res, next) => {
  try {
    const days = { daily: 7, weekly: 30, monthly: 90 }[req.query.range] || 7;
    const range = ["daily", "weekly", "monthly"].includes(req.query.range) ? req.query.range : "daily";
    const since = new Date(Date.now() - days * 86400000);
    const employees = await departmentEmployees(req.user.department); const ids = employees.map((employee) => employee._id);
    const checkins = await CheckIn.find({ user: { $in: ids }, createdAt: { $gte: since } }).sort({ shiftDate: 1 }).lean();
    const contributors = new Set(checkins.map((item) => String(item.user)));
    if (contributors.size < 3) return res.json({ suppressed: true, minimumGroupSize: 3, contributorCount: contributors.size, points: [] });
    const groups = new Map();
    for (const checkin of checkins) { const key = trendBucket(checkin, range); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(checkin); }
    const points = [...groups.entries()].map(([date, items]) => {
      const mornings = items.filter((item) => item.type === "morning");
      const evenings = items.filter((item) => item.type === "evening");
      return {
        date,
        score: average(items, "wellbeingScore"),
        mood: average(items, "mood"),
        stress: average(items, "stress"),
        workload: average(items, "workload"),
        morningScore: average(mornings, "wellbeingScore"),
        eveningScore: average(evenings, "wellbeingScore"),
        morningMood: average(mornings, "mood"), eveningMood: average(evenings, "mood"),
        morningStress: average(mornings, "stress"), eveningStress: average(evenings, "stress"),
        morningWorkload: average(mornings, "workload"), eveningWorkload: average(evenings, "workload"),
        completion: Number((items.length / Math.max(1, contributors.size * 2) * 100).toFixed(0)),
        overtime: Number(items.reduce((sum, item) => sum + Number(item.plannedOvertimeHours || 0), 0).toFixed(1)),
        responses: items.length,
        employees: new Set(items.map((item) => String(item.user))).size
      };
    });
    res.json({ suppressed: false, contributorCount: contributors.size, points, summary: { score: average(checkins, "wellbeingScore"), mood: average(checkins, "mood"), stress: average(checkins, "stress"), workload: average(checkins, "workload"), overtime: Number(checkins.reduce((sum, item) => sum + Number(item.plannedOvertimeHours || 0), 0).toFixed(1)) } });
  } catch (error) { next(error); }
});

router.post("/my-checkins", async (req, res, next) => {
  try {
    const values = [req.body.mood, req.body.stress, req.body.workload].map(Number);
    if (values.some((value) => !Number.isFinite(value) || value < 1 || value > 5)) return res.status(400).json({ message: "Mood, stress, and workload must be between 1 and 5" });
    const checkin = await HrCheckIn.create({ user: req.user._id, mood: values[0], stress: values[1], workload: values[2], note: String(req.body.note || "").slice(0, 1000) });
    res.status(201).json({ checkin });
  } catch (error) { next(error); }
});

export default router;
