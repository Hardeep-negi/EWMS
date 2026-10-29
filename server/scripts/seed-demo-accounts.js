import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/db.js";
import User from "../src/models/User.js";
import CheckIn from "../src/models/CheckIn.js";
import Concern from "../src/models/Concern.js";
import Feedback from "../src/models/Feedback.js";
import WellbeingGoal from "../src/models/WellbeingGoal.js";
import SupportAction from "../src/models/SupportAction.js";
import { calculateWellbeingScore } from "../src/utils/score.js";

const employeeEmail = "sahilsingh@gmail.com";
const hrEmail = "subhamsekhar@gmail.com";
const department = "Development";

function indianDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function atIndianTime(shiftDate, hour, minute) {
  return new Date(`${shiftDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
}

async function upsertDemoUser({ email, password, name, phone, role, jobTitle }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        email,
        passwordHash,
        phone,
        role,
        department,
        jobTitle,
        accessStatus: "approved",
        emailVerified: true,
        emailOtpHash: null,
        emailOtpExpiresAt: null,
        emailOtpAttempts: 0,
        emailOtpSentAt: null
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  await connectDatabase();

  const employee = await upsertDemoUser({
    email: employeeEmail,
    password: "Sahil123",
    name: "Sahil Singh",
    phone: "9876543210",
    role: "employee",
    jobTitle: "Frontend Developer"
  });
  const hr = await upsertDemoUser({
    email: hrEmail,
    password: "Subham123",
    name: "Subham Sekhar",
    phone: "9876543211",
    role: "hr",
    jobTitle: "HR Business Partner"
  });

  // Make the script safe to run again before a demonstration.
  await Promise.all([
    CheckIn.deleteMany({ user: employee._id, shiftDate: { $gte: "2026-10-25", $lte: "2026-10-29" } }),
    Concern.deleteMany({ user: employee._id, message: { $regex: /^Demo concern:/ } }),
    Feedback.deleteMany({ user: employee._id, message: { $regex: /^Demo feedback:/ } }),
    WellbeingGoal.deleteMany({ user: employee._id, title: { $regex: /^Demo goal:/ } }),
    SupportAction.deleteMany({ employee: employee._id, title: { $regex: /^Demo support:/ } })
  ]);

  const dailyResponses = [
    { date: "2026-10-25", morning: [2, 5, 5], evening: [2, 5, 5] },
    { date: "2026-10-26", morning: [2, 5, 4], evening: [2, 5, 5] },
    { date: "2026-10-27", morning: [3, 4, 5], evening: [2, 5, 5] },
    { date: "2026-10-28", morning: [2, 5, 5], evening: [3, 4, 5] },
    { date: "2026-10-29", morning: [2, 5, 5], evening: [2, 5, 5] }
  ];

  const checkins = dailyResponses.flatMap(({ date, morning, evening }, dayIndex) => {
    const makeCheckin = (type, [mood, stress, workload], hour, minute) => {
      const overtimeHours = type === "evening" ? 2 : 0;
      const score = calculateWellbeingScore({ mood, stress, workload, overtimeHours });
      const createdAt = atIndianTime(date, hour, minute);
      return {
        user: employee._id,
        type,
        shiftDate: date,
        checkInAt: createdAt,
        mood,
        stress,
        workload,
        plannedOvertime: type === "evening",
        plannedOvertimeHours: overtimeHours,
        expectedCompensation: type === "evening" ? 1000 : 0,
        comment: type === "morning" ? "Demo check-in: workload feels difficult to manage." : "Demo check-in: feeling pressured after a demanding day.",
        ...score,
        date: createdAt,
        createdAt,
        updatedAt: createdAt
      };
    };
    return [
      makeCheckin("morning", morning, 9, 10 + dayIndex),
      makeCheckin("evening", evening, 17, 20 + dayIndex)
    ];
  });
  await CheckIn.insertMany(checkins, { timestamps: false });

  const goals = [
    ["Take a short recovery break", "Add two short breaks to each workday."],
    ["Set daily task priorities", "Plan the most important tasks before the shift begins."],
    ["Use focus time", "Reserve one focused hour without meeting interruptions."],
    ["Review workload with HR", "Prepare workload notes for a supportive conversation."]
  ].map(([title, description], index) => {
    const createdAt = atIndianTime(`2026-10-${String(25 + index).padStart(2, "0")}`, 10, 0);
    return {
      user: employee._id,
      title: `Demo goal: ${title}`,
      description,
      target: "Completed for project demonstration",
      startDate: "2026-10-25",
      targetDate: `2026-10-${String(26 + index).padStart(2, "0")}`,
      progress: 100,
      status: "completed",
      sharedWithHR: false,
      createdAt,
      updatedAt: createdAt
    };
  });
  await WellbeingGoal.insertMany(goals, { timestamps: false });

  const concerns = await Concern.insertMany([
    {
      user: employee._id,
      anonymous: false,
      category: "Workload",
      urgency: "High",
      message: "Demo concern: I need help managing a high workload and repeated deadlines.",
      status: "submitted",
      createdAt: atIndianTime("2026-10-27", 13, 0),
      updatedAt: atIndianTime("2026-10-27", 13, 0)
    },
    {
      user: employee._id,
      anonymous: false,
      category: "Work-life balance",
      urgency: "Medium",
      message: "Demo concern: Extended work hours are affecting my work-life balance.",
      status: "submitted",
      createdAt: atIndianTime("2026-10-29", 12, 30),
      updatedAt: atIndianTime("2026-10-29", 12, 30)
    }
  ], { timestamps: false });

  await Feedback.insertMany([
    ["Workload", "Demo feedback: Better workload planning would help the team.", "2026-10-26"],
    ["Management", "Demo feedback: More regular priority discussions would be useful.", "2026-10-27"],
    ["Work-life balance", "Demo feedback: Flexible support during peak delivery periods would help.", "2026-10-29"]
  ].map(([category, message, date]) => ({
    user: employee._id,
    anonymous: false,
    department,
    category,
    message: `Demo feedback: ${message.replace(/^Demo feedback: /, "")}`,
    createdAt: atIndianTime(date, 14, 0),
    updatedAt: atIndianTime(date, 14, 0)
  })), { timestamps: false });

  const averageScore = Math.round(checkins.reduce((total, item) => total + item.wellbeingScore, 0) / checkins.length);
  console.log(JSON.stringify({
    seeded: true,
    employee: { email: employee.email, checkins: checkins.length, completedGoals: goals.length, concerns: concerns.length, knownFeedback: 3, averageScore },
    hr: { email: hr.email },
    dates: { from: indianDate(atIndianTime("2026-10-25", 0, 0)), to: indianDate(atIndianTime("2026-10-29", 0, 0)) }
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
