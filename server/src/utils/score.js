export function calculateWellbeingScore({ mood, stress, workload, overtimeHours = 0, leaveDays = 0 }) {
  const score = Math.round(
    72 +
    Number(mood) * 14 -
    Number(stress) * 9 -
    Number(workload) * 7 -
    Math.min(Number(overtimeHours) * 3, 15) -
    Math.min(Number(leaveDays) * 4, 12)
  );

  const wellbeingScore = Math.max(0, Math.min(100, score));
  const riskLevel = wellbeingScore < 50 ? "at-risk" : wellbeingScore < 70 ? "watch" : "healthy";

  return { wellbeingScore, riskLevel };
}
