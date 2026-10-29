import { getShiftWindow } from "./shift.js";

export const reminderDefaults = { enabled: true, intervalMinutes: 75, breakEnabled: true, waterEnabled: true, stretchEnabled: true, lastShownAt: null, snoozedUntil: null };

export function reminderStatus(preferences, shift, now = new Date()) {
  const prefs = { ...reminderDefaults, ...(preferences || {}) };
  const window = getShiftWindow(shift, now);
  const withinShift = window.workingDay && now >= window.start && now < window.end;
  const availableTypes = ["break", "water", "stretch"].filter((type) => prefs[`${type}Enabled`]);
  const intervalMs = prefs.intervalMinutes * 60000;
  const nextType = availableTypes.length ? availableTypes[Math.floor(now.getTime() / intervalMs) % availableTypes.length] : null;
  const last = prefs.lastShownAt ? new Date(prefs.lastShownAt) : null;
  const due = Boolean(prefs.enabled && withinShift && nextType && (!last || now - last >= intervalMs) && (!prefs.snoozedUntil || now >= new Date(prefs.snoozedUntil)));
  return { preferences: prefs, status: { due, type: due ? nextType : null, withinShift, shiftDate: window.shiftDate, serverNow: now } };
}
