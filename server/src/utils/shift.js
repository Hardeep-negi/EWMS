function zonedParts(timezone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second) };
}

function zonedDateTime(timezone, year, month, day, minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const actual = zonedParts(timezone, guess);
  const displayedUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
  return new Date(guess.getTime() - (displayedUtc - guess.getTime()));
}

export function getShiftWindow(shift, now = new Date()) {
  const timezone = shift?.timezone || "Asia/Kolkata";
  const startMinutes = shift?.startMinutes ?? 540;
  const endMinutes = shift?.endMinutes ?? 1020;
  const parts = zonedParts(timezone, now);
  const shiftDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const start = zonedDateTime(timezone, parts.year, parts.month, parts.day, startMinutes);
  let end = zonedDateTime(timezone, parts.year, parts.month, parts.day, endMinutes);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return {
    shiftDate,
    timezone,
    start,
    end,
    workingDay: (shift?.workingDays || [1, 2, 3, 4, 5]).includes(weekday),
    startLabel: start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: timezone }),
    endLabel: end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: timezone })
  };
}

export function clockStatus(morning, evening, shift, now = new Date()) {
  const window = getShiftWindow(shift, now);
  const startedAt = morning?.checkInAt ? new Date(morning.checkInAt) : null;
  const elapsedMinutes = startedAt ? Math.max(0, Math.floor((Math.min(now.getTime(), window.end.getTime()) - startedAt.getTime()) / 60000)) : 0;
  const eveningDueAt = new Date(window.end.getTime() - 60 * 60 * 1000);
  const eveningDue = window.workingDay && now >= eveningDueAt;
  const morningLate = window.workingDay && now >= window.start && !morning;
  const eveningLate = window.workingDay && now >= window.end && !evening;
  return {
    ...window,
    morningComplete: Boolean(morning),
    eveningComplete: Boolean(evening),
    inShift: window.workingDay && now >= window.start && now < window.end,
    elapsedMinutes,
    remainingMinutes: Math.max(0, Math.ceil((window.end.getTime() - now.getTime()) / 60000)),
    running: Boolean(startedAt && now < window.end),
    serverNow: now,
    eveningDueAt,
    eveningDue,
    morningStatus: morning ? "completed" : morningLate ? "late" : "pending",
    eveningStatus: evening ? "completed" : eveningLate ? "late" : eveningDue ? "pending" : "not-due",
    morning,
    evening
  };
}
