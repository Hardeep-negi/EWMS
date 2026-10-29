export const WELLBEING_SCORE_VERSION = "v2";

// v2 is a transparent, non-clinical 0-100 indicator. It starts from a neutral
// midpoint and applies bounded adjustments to the employee's own responses.
export function calculateWellbeingScore({ mood, stress, workload, overtimeHours = 0, leaveDays = 0 }) {
  // A transparent 0-100 supportive indicator. Each 1-5 response contributes
  // a bounded amount so positive responses do not routinely clamp at 100.
  const score = Math.round(
    50 +
    (Number(mood) - 3) * 12 -
    (Number(stress) - 3) * 10 -
    (Number(workload) - 3) * 6 -
    Math.min(Number(overtimeHours) * 2, 10) -
    Math.min(Number(leaveDays) * 2, 8)
  );

  const wellbeingScore = Math.max(0, Math.min(100, score));
  const riskLevel = wellbeingScore < 50 ? "at-risk" : wellbeingScore < 70 ? "watch" : "healthy";

  return { wellbeingScore, riskLevel, scoreVersion: WELLBEING_SCORE_VERSION };
}
