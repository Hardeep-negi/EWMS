import test from "node:test";
import assert from "node:assert/strict";
import { clockStatus } from "../src/utils/shift.js";
import { reminderStatus } from "../src/utils/reminders.js";

const shift = { timezone: "Asia/Kolkata", startMinutes: 540, endMinutes: 1020, workingDays: [1, 2, 3, 4, 5] };

test("clock derives elapsed time from the saved morning timestamp", () => {
  const now = new Date("2026-09-30T06:30:00.000Z");
  const morning = { checkInAt: new Date("2026-09-30T03:50:00.000Z") };
  const status = clockStatus(morning, null, shift, now);
  assert.equal(status.elapsedMinutes, 160);
  assert.equal(status.remainingMinutes, 300);
  assert.equal(status.morningStatus, "completed");
});

test("evening check-in becomes due one hour before the configured shift end", () => {
  const status = clockStatus(null, null, shift, new Date("2026-09-30T10:40:00.000Z"));
  assert.equal(status.eveningDue, true);
  assert.equal(status.eveningStatus, "pending");
});

test("reminders are only due in shift and respect snooze state", () => {
  const inShift = reminderStatus({ intervalMinutes: 60 }, shift, new Date("2026-09-30T06:30:00.000Z"));
  assert.equal(inShift.status.due, true);
  const snoozed = reminderStatus({ intervalMinutes: 60, snoozedUntil: new Date("2026-09-30T07:00:00.000Z") }, shift, new Date("2026-09-30T06:30:00.000Z"));
  assert.equal(snoozed.status.due, false);
  const afterShift = reminderStatus({ intervalMinutes: 60 }, shift, new Date("2026-09-30T12:00:00.000Z"));
  assert.equal(afterShift.status.due, false);
});
