import test from "node:test";
import assert from "node:assert/strict";
import { calculateWellbeingScore, WELLBEING_SCORE_VERSION } from "../src/utils/score.js";

test("wellbeing score is bounded and carries its formula version", () => {
  const result = calculateWellbeingScore({ mood: 5, stress: 1, workload: 1, overtimeHours: 0 });
  assert.equal(result.scoreVersion, WELLBEING_SCORE_VERSION);
  assert.ok(result.wellbeingScore >= 0 && result.wellbeingScore <= 100);
});

test("higher self-reported stress reduces the wellbeing score", () => {
  const calm = calculateWellbeingScore({ mood: 3, stress: 1, workload: 3 });
  const stressed = calculateWellbeingScore({ mood: 3, stress: 5, workload: 3 });
  assert.ok(calm.wellbeingScore > stressed.wellbeingScore);
});

test("overtime adjustments are bounded", () => {
  const moderate = calculateWellbeingScore({ mood: 3, stress: 3, workload: 3, overtimeHours: 5 });
  const extreme = calculateWellbeingScore({ mood: 3, stress: 3, workload: 3, overtimeHours: 500 });
  assert.equal(moderate.wellbeingScore, extreme.wellbeingScore);
});
