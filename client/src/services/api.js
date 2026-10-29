const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...options
    });
  } catch {
    throw new Error("Backend API is not running. Start the server and connect MongoDB.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export const api = {
  async signup(payload) {
    return request("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
  },
  async login(payload) {
    return request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  },
  async verifyEmail(payload) { return request("/auth/verify-email", { method: "POST", body: JSON.stringify(payload) }); },
  async resendOtp(payload) { return request("/auth/resend-otp", { method: "POST", body: JSON.stringify(payload) }); },
  async superAdminSignup(payload) { return request("/auth/super-admin/signup", { method: "POST", body: JSON.stringify(payload) }); },
  async getSuperAdminDashboard() { return request("/super-admin/dashboard"); },
  async getSuperAdminHr() { return request("/super-admin/hr"); },
  async getSuperAdminEmployees(q = "") { return request(`/super-admin/employees${q ? `?q=${encodeURIComponent(q)}` : ""}`); },
  async approveHr(id) { return request(`/super-admin/hr/${id}/approve`, { method: "PATCH" }); },
  async rejectHr(id) { return request(`/super-admin/hr/${id}/reject`, { method: "PATCH" }); },
  async getProfile() {
    return request("/user/me");
  },
  async updateProfile(payload) { return request("/user/me", { method: "PATCH", body: JSON.stringify(payload) }); },
  async getCheckins() {
    return request("/checkins");
  },
  async getCheckinStatus() {
    return request("/checkins/status");
  },
  async getGoals() { return request("/goals"); },
  async createGoal(payload) { return request("/goals", { method: "POST", body: JSON.stringify(payload) }); },
  async updateGoal(id, payload) { return request(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }); },
  async getReportWeeks() { return request("/reports/weeks"); },
  async getWeeklyReport(start) { return request(`/reports/weekly${start ? `?start=${start}` : ""}`); },
  async createCheckin(payload) {
    return request("/checkins", { method: "POST", body: JSON.stringify(payload) });
  },
  async createConcern(payload) {
    return request("/concerns", { method: "POST", body: JSON.stringify(payload) });
  },
  async getConcerns() {
    return request("/concerns");
  },
  async getHrOverview() { return request("/hr/overview"); },
  async getHrEmployees(params = {}) { const query = new URLSearchParams(params).toString(); return request(`/hr/employees${query ? `?${query}` : ""}`); },
  async getHrEmployee(id) { return request(`/hr/employees/${id}`); },
  async getHrTrends(range) { return request(`/hr/trends?range=${range}`); },
  async createHrCheckin(payload) { return request("/hr/my-checkins", { method: "POST", body: JSON.stringify(payload) }); },
  async getSupportActions() { return request("/support"); },
  async getSupportConcerns() { return request("/support/concerns"); },
  async createSupportAction(payload) { return request("/support", { method: "POST", body: JSON.stringify(payload) }); },
  async updateSupportAction(id, payload) { return request(`/support/${id}`, { method: "PATCH", body: JSON.stringify(payload) }); },
  async dismissSupportAction(id) { return request(`/support/mine/${id}/dismiss`, { method: "PATCH" }); },
  async getMySupportActions() { return request("/support/mine"); },
  async getWellnessEvents() { return request("/wellness/events"); },
  async createWellnessEvent(payload) { return request("/wellness/events", { method: "POST", body: JSON.stringify(payload) }); },
  async updateWellnessEvent(id, payload) { return request(`/wellness/events/${id}`, { method: "PATCH", body: JSON.stringify(payload) }); },
  async registerForWellnessEvent(id) { return request(`/wellness/events/${id}/register`, { method: "POST" }); },
  async cancelWellnessRegistration(id) { return request(`/wellness/events/${id}/register`, { method: "DELETE" }); },
  async submitFeedback(payload) { return request("/feedback", { method: "POST", body: JSON.stringify(payload) }); },
  async getFeedbackAnalysis() { return request("/feedback/analysis"); },
  async getReminderStatus() { return request("/reminders"); },
  async updateReminderPreferences(payload) { return request("/reminders/preferences", { method: "PATCH", body: JSON.stringify(payload) }); },
  async actOnReminder(action) { return request("/reminders/action", { method: "POST", body: JSON.stringify({ action }) }); }
};
