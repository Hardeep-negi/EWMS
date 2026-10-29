import test from "node:test";
import assert from "node:assert/strict";
import { requireRole } from "../src/middleware/auth.js";

function responseRecorder() {
  const result = { statusCode: null, body: null };
  return { result, status(code) { result.statusCode = code; return this; }, json(body) { result.body = body; return this; } };
}

test("employee-only middleware blocks an HR user", () => {
  const res = responseRecorder();
  let advanced = false;
  requireRole("employee")({ user: { role: "hr" } }, res, () => { advanced = true; });
  assert.equal(advanced, false);
  assert.equal(res.result.statusCode, 403);
});

test("HR middleware permits an HR user", () => {
  const res = responseRecorder();
  let advanced = false;
  requireRole("hr")({ user: { role: "hr" } }, res, () => { advanced = true; });
  assert.equal(advanced, true);
  assert.equal(res.result.statusCode, null);
});
