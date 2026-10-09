export const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8000").replace(/\/$/, "");

function authHeaders(isMultipart = false) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function handleResponse(res) {
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const err = await res.json();
      msg = err.error || err.message || JSON.stringify(err);
    } catch {
      msg = `HTTP ${res.status} ${res.statusText}`;
    }
    throw new Error(msg);
  }
  return res.json();
}

// ─── AUTHENTICATION ─────────────────────────────────────────────────────────

export async function register(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  // Backend returns { access_token } — store under "token" key for authHeaders()
  const tok = data.access_token || data.token;
  if (tok) {
    localStorage.setItem("token", tok);
    localStorage.setItem("user", JSON.stringify(data));
  }
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(res);
  // Backend returns { access_token } — store under "token" key for authHeaders()
  const tok = data.access_token || data.token;
  if (tok) {
    localStorage.setItem("token", tok);
    localStorage.setItem("user", JSON.stringify(data));
  }
  return data;
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function updateProfile(payload) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getStoredUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export async function getDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── FARMS ───────────────────────────────────────────────────────────────────

export async function listFarms() {
  const res = await fetch(`${API_BASE}/farms`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getFarm(farmId) {
  const res = await fetch(`${API_BASE}/farms/${farmId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createFarm(farmData) {
  const res = await fetch(`${API_BASE}/farms`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(farmData),
  });
  return handleResponse(res);
}

// ─── FIELDS ──────────────────────────────────────────────────────────────────

export async function listFields(farmId) {
  const res = await fetch(`${API_BASE}/fields/farm/${farmId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createField(fieldData) {
  const res = await fetch(`${API_BASE}/fields`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(fieldData),
  });
  return handleResponse(res);
}

// ─── CROPS ───────────────────────────────────────────────────────────────────

export async function listAllCrops() {
  const res = await fetch(`${API_BASE}/crops`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function listCropsByField(fieldId) {
  const res = await fetch(`${API_BASE}/crops/field/${fieldId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getCrop(cropId) {
  const res = await fetch(`${API_BASE}/crops/${cropId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createCrop(cropData) {
  const res = await fetch(`${API_BASE}/crops`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(cropData),
  });
  return handleResponse(res);
}

export async function updateCrop(cropId, updates) {
  const res = await fetch(`${API_BASE}/crops/${cropId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function deleteCrop(cropId) {
  const res = await fetch(`${API_BASE}/crops/${cropId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── MONITORING & SCANNING ───────────────────────────────────────────────────

export async function listMonitoringSessions(cropId) {
  const res = await fetch(`${API_BASE}/monitoring/crop/${cropId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getMonitoringSession(sessionId) {
  const res = await fetch(`${API_BASE}/monitoring/session/${sessionId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getAnalysisDetail(analysisId) {
  const res = await fetch(`${API_BASE}/monitoring/analysis/${analysisId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function uploadAndAnalyze(cropId, imageFiles, notes = "") {
  const formData = new FormData();
  if (Array.isArray(imageFiles)) {
    imageFiles.forEach(file => formData.append("images", file));
  } else {
    formData.append("images", imageFiles);
  }
  if (notes) {
    formData.append("notes", notes);
  }

  const res = await fetch(`${API_BASE}/monitoring/crop/${cropId}/upload`, {
    method: "POST",
    headers: authHeaders(true),
    body: formData,
  });
  return handleResponse(res);
}

// ─── TREATMENTS ─────────────────────────────────────────────────────────────

export async function listTreatments(cropId) {
  const res = await fetch(`${API_BASE}/treatments/crop/${cropId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createTreatment(treatmentData) {
  const res = await fetch(`${API_BASE}/treatments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(treatmentData),
  });
  return handleResponse(res);
}

export async function updateTreatment(treatmentId, updates) {
  const res = await fetch(`${API_BASE}/treatments/${treatmentId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function deleteTreatment(treatmentId) {
  const res = await fetch(`${API_BASE}/treatments/${treatmentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── REMINDERS ──────────────────────────────────────────────────────────────

export async function listPendingReminders() {
  const res = await fetch(`${API_BASE}/reminders`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function listRemindersByCrop(cropId) {
  const res = await fetch(`${API_BASE}/reminders/crop/${cropId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createReminder(data) {
  const res = await fetch(`${API_BASE}/reminders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateReminderStatus(id, status = "COMPLETED") {
  const res = await fetch(`${API_BASE}/reminders/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function askChatbot(question, cropContext = null, history = [], cropDetails = null, userLocation = null) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      question,
      crop_context: cropContext,
      history,
      crop_details: cropDetails,
      user_location: userLocation,
    }),
  });
  return handleResponse(res);
}

export async function getChatHistory() {
  const res = await fetch(`${API_BASE}/ai/chat/history`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── ADMIN ──────────────────────────────────────────────────────────────────

export async function getAdminSummary() {
  const res = await fetch(`${API_BASE}/admin/summary`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getAdminRegions() {
  const res = await fetch(`${API_BASE}/admin/regions`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getRegionDiseases(region) {
  const res = await fetch(`${API_BASE}/admin/regions/${encodeURIComponent(region)}/diseases`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getAdminAlerts(windowDays = 30) {
  const res = await fetch(`${API_BASE}/admin/alerts?window_days=${windowDays}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getAdminOutbreaks(windowDays = 30) {
  const res = await fetch(`${API_BASE}/admin/outbreaks?window_days=${windowDays}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getNewDiseases(windowDays = 14) {
  const res = await fetch(`${API_BASE}/admin/new-diseases?window_days=${windowDays}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getAdminFarmers(region = null) {
  const url = region
    ? `${API_BASE}/admin/farmers?region=${encodeURIComponent(region)}`
    : `${API_BASE}/admin/farmers`;
  const res = await fetch(url, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getFarmerCrops(farmerId) {
  const res = await fetch(`${API_BASE}/admin/farmers/${farmerId}/crops`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getAdminModelInfo() {
  const res = await fetch(`${API_BASE}/admin/model-info`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function triggerModelTraining(arch = "mobilenetv2", epochs = 20) {
  const res = await fetch(
    `${API_BASE}/admin/train-model?arch=${arch}&epochs=${epochs}`,
    { method: "POST", headers: authHeaders() }
  );
  return handleResponse(res);
}

export async function getDatasetStats() {
  const res = await fetch(`${API_BASE}/admin/dataset-stats`, { headers: authHeaders() });
  return handleResponse(res);
}

