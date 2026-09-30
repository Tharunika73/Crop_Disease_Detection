/**
 * API client for CropHealthApp.jsx to talk to the real FastAPI backend.
 *
 * Wire this in by replacing the mock functions in CropHealthApp.jsx:
 *   - pickDisease()          -> call scanCrop() instead, use the returned .disease/.confidence
 *   - weatherFavorability()  -> weather now comes back inside the scanCrop() response
 *   - computeRisk()          -> risk_score / risk_band now come back inside scanCrop() response
 *   - history state          -> populate from getScanHistory() on crop change
 *
 * Set API_BASE to your deployed backend URL (e.g. https://your-api.onrender.com)
 * or http://localhost:8000 for local development.
 */
const API_BASE = "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function register(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
  const data = await res.json();
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function createCropSelection({ crop, variety, sowing_date }) {
  const res = await fetch(`${API_BASE}/crops`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ crop, variety, sowing_date }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Could not create crop selection");
  return res.json();
}

export async function listCropSelections() {
  const res = await fetch(`${API_BASE}/crops`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Could not load crop selections");
  return res.json();
}

/** Uploads a leaf image and runs the full detect -> severity -> weather -> risk -> advisory pipeline. */
export async function scanCrop(cropSelectionId, imageFile) {
  const form = new FormData();
  form.append("crop_selection_id", cropSelectionId);
  form.append("image", imageFile);
  const res = await fetch(`${API_BASE}/scans`, {
    method: "POST",
    headers: authHeaders(), // do NOT set Content-Type manually for FormData
    body: form,
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Scan failed");
  return res.json();
}

export async function getScanHistory(cropSelectionId) {
  const res = await fetch(`${API_BASE}/scans/history/${cropSelectionId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Could not load scan history");
  return res.json();
}

export async function askChatbot(scanId, message) {
  const res = await fetch(`${API_BASE}/chatbot/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ scan_id: scanId, message }),
  });
  if (!res.ok) throw new Error("Chatbot request failed");
  return (await res.json()).reply;
}

export async function getAdminRegions() {
  const res = await fetch(`${API_BASE}/admin/regions`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Could not load regional data");
  return res.json();
}

export async function getAdminOutbreaks() {
  const res = await fetch(`${API_BASE}/admin/outbreaks`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Could not load outbreak alerts");
  return res.json();
}
