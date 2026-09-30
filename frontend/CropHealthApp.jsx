import React, { useState, useEffect, useRef } from "react";
import {
  Sprout,
  Leaf,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  MessageSquare,
  Droplets,
  Calendar,
  ChevronRight,
  ArrowRight,
  Upload,
  Camera,
  User as UserIcon,
  LogOut,
  RefreshCw,
  Layers,
  MapPin,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Send,
  ShieldCheck,
  Info,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";

import * as api from "./src/api";

// ─── UTILITY STYLING & HELPERS ───────────────────────────────────────────────

const getStatusBadge = (status) => {
  switch (status?.toUpperCase()) {
    case "HEALTHY":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
        </span>
      );
    case "MONITORING":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5" /> Monitoring
        </span>
      );
    case "ATTENTION":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
          <AlertTriangle className="w-3.5 h-3.5" /> Attention Required
        </span>
      );
    case "TREATMENT":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertCircle className="w-3.5 h-3.5" /> In Treatment
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          Pending
        </span>
      );
  }
};

// ─── MAIN APP COMPONENT ──────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(api.getStoredUser());
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, farms, crops, scan, treatments, reminders, chat, profile
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Global app state
  const [dashboardData, setDashboardData] = useState(null);
  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [monitoringSessions, setMonitoringSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [analysisDetail, setAnalysisDetail] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSessionId, setChatSessionId] = useState(null);
  const [chatSending, setChatSending] = useState(false);

  // Modals & UI forms
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [selectedFarmForField, setSelectedFarmForField] = useState(null);

  // Scan / Upload state
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadCropId, setUploadCropId] = useState("");
  const [uploading, setUploading] = useState(false);

  // Auto-clear notifications
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg("");
        setSuccessMsg("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  // Initial load when user logs in
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [dash, farmList, cropList, remList] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.listFarms().catch(() => []),
        api.listAllCrops().catch(() => []),
        api.listPendingReminders().catch(() => []),
      ]);
      setDashboardData(dash);
      setFarms(farmList || []);
      setCrops(cropList || []);
      setReminders(remList || []);
      if (cropList && cropList.length > 0 && !selectedCrop) {
        setSelectedCrop(cropList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load crop-specific data when selectedCrop changes
  useEffect(() => {
    if (selectedCrop && selectedCrop.id) {
      loadCropDetails(selectedCrop.id);
    }
  }, [selectedCrop]);

  const loadCropDetails = async (cropId) => {
    try {
      const [sessions, treatList] = await Promise.all([
        api.listMonitoringSessions(cropId).catch(() => []),
        api.listTreatments(cropId).catch(() => []),
      ]);
      setMonitoringSessions(sessions || []);
      setTreatments(treatList || []);
      if (sessions && sessions.length > 0) {
        setSelectedSession(sessions[0]);
        if (sessions[0].analysis?.id) {
          api.getAnalysisDetail(sessions[0].analysis.id)
            .then(setAnalysisDetail)
            .catch(() => setAnalysisDetail(null));
        }
      } else {
        setSelectedSession(null);
        setAnalysisDetail(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    api.logout();
    setUser(null);
    setActiveTab("dashboard");
  };

  // If user is not logged in, show modern Auth Screen
  if (!user) {
    return <AuthScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ─── TOP NAVIGATION HEADER ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl tracking-tight text-slate-900">AgriCare</span>
                  <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    AI Full-Stack
                  </span>
                </div>
                <p className="text-xs text-slate-500">Smart Crop Monitoring & Advisory</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: "dashboard", label: "Dashboard", icon: BarChart3 },
                { id: "farms", label: "Farms & Fields", icon: Layers },
                { id: "crops", label: "My Crops", icon: Leaf },
                { id: "scan", label: "Scan & Monitor", icon: Camera },
                { id: "treatments", label: "Treatments", icon: Activity },
                { id: "reminders", label: "Reminders", icon: Calendar, badge: reminders.length },
                { id: "chat", label: "AI Advisor", icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                        : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        isActive ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("profile")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-sm font-medium text-slate-700"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <span className="hidden sm:inline font-medium text-slate-800">{user.name || "Farmer"}</span>
              </button>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-100 gap-1 bg-white">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "farms", label: "Farms", icon: Layers },
            { id: "crops", label: "Crops", icon: Leaf },
            { id: "scan", label: "Scan", icon: Camera },
            { id: "treatments", label: "Treatments", icon: Activity },
            { id: "reminders", label: "Tasks", icon: Calendar },
            { id: "chat", label: "AI Chat", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs whitespace-nowrap font-medium ${
                  isActive ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ─── ALERT NOTIFICATIONS ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="text-sm font-medium">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ─── MAIN CONTENT ROUTING ─── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === "dashboard" && (
          <DashboardView
            dashboard={dashboardData}
            crops={crops}
            reminders={reminders}
            onSelectCrop={(c) => {
              setSelectedCrop(c);
              setActiveTab("crops");
            }}
            onScanNew={() => setActiveTab("scan")}
            onAskChat={() => setActiveTab("chat")}
            onRefresh={loadInitialData}
            loading={loading}
          />
        )}

        {activeTab === "farms" && (
          <FarmsView
            farms={farms}
            onAddFarm={() => setShowFarmModal(true)}
            onAddField={(farm) => {
              setSelectedFarmForField(farm);
              setShowFieldModal(true);
            }}
            onRefresh={loadInitialData}
          />
        )}

        {activeTab === "crops" && (
          <CropsView
            crops={crops}
            selectedCrop={selectedCrop}
            onSelectCrop={(c) => setSelectedCrop(c)}
            onAddCrop={() => setShowCropModal(true)}
            monitoringSessions={monitoringSessions}
            analysisDetail={analysisDetail}
            onScanNow={() => {
              if (selectedCrop) setUploadCropId(selectedCrop.id);
              setActiveTab("scan");
            }}
            onAddTreatment={() => setShowTreatmentModal(true)}
            onRefresh={() => {
              loadInitialData();
              if (selectedCrop) loadCropDetails(selectedCrop.id);
            }}
          />
        )}

        {activeTab === "scan" && (
          <ScanView
            crops={crops}
            selectedCropId={uploadCropId || (selectedCrop ? selectedCrop.id : "")}
            setSelectedCropId={setUploadCropId}
            uploadFiles={uploadFiles}
            setUploadFiles={setUploadFiles}
            uploadNotes={uploadNotes}
            setUploadNotes={setUploadNotes}
            uploading={uploading}
            onSubmitScan={async () => {
              if (!uploadCropId && !selectedCrop) {
                setErrorMsg("Please select a crop to monitor.");
                return;
              }
              if (uploadFiles.length === 0) {
                setErrorMsg("Please choose or capture at least one crop leaf photo.");
                return;
              }
              setUploading(true);
              try {
                const targetCropId = uploadCropId || selectedCrop.id;
                const result = await api.uploadAndAnalyze(targetCropId, uploadFiles, uploadNotes);
                setSuccessMsg("Analysis completed successfully!");
                setUploadFiles([]);
                setUploadNotes("");
                // Reload crop details
                const updatedCrop = await api.getCrop(targetCropId);
                setSelectedCrop(updatedCrop);
                await loadCropDetails(targetCropId);
                setActiveTab("crops");
              } catch (err) {
                setErrorMsg(err.message || "Failed to analyze image");
              } finally {
                setUploading(false);
              }
            }}
          />
        )}

        {activeTab === "treatments" && (
          <TreatmentsView
            crops={crops}
            selectedCrop={selectedCrop}
            setSelectedCrop={setSelectedCrop}
            treatments={treatments}
            onAddTreatment={() => setShowTreatmentModal(true)}
            onRefresh={() => {
              if (selectedCrop) loadCropDetails(selectedCrop.id);
            }}
          />
        )}

        {activeTab === "reminders" && (
          <RemindersView
            reminders={reminders}
            onCompleteReminder={async (id) => {
              try {
                await api.updateReminderStatus(id, "COMPLETED");
                setSuccessMsg("Reminder marked as completed!");
                loadInitialData();
              } catch (err) {
                setErrorMsg("Could not update reminder");
              }
            }}
            onRefresh={loadInitialData}
          />
        )}

        {activeTab === "chat" && (
          <ChatView
            crops={crops}
            selectedCrop={selectedCrop}
            messages={chatMessages}
            input={chatInput}
            setInput={setChatInput}
            sending={chatSending}
            onSendMessage={async () => {
              if (!chatInput.trim()) return;
              const q = chatInput.trim();
              const userMsg = { role: "user", text: q, timestamp: new Date() };
              setChatMessages((prev) => [...prev, userMsg]);
              setChatInput("");
              setChatSending(true);
              try {
                const cropContext = selectedCrop ? (selectedCrop.crop_name || selectedCrop.name || selectedCrop.crop_type || "crop") : null;
                const res = await api.askChatbot(q, cropContext, chatSessionId);
                if (res.sessionId) setChatSessionId(res.sessionId);
                const botMsg = { role: "bot", text: res.answer, timestamp: new Date() };
                setChatMessages((prev) => [...prev, botMsg]);
              } catch (err) {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    role: "bot",
                    text: "Sorry, I encountered an issue retrieving the advisory. Please try again.",
                    timestamp: new Date(),
                  },
                ]);
              } finally {
                setChatSending(false);
              }
            }}
          />
        )}

        {activeTab === "profile" && (
          <ProfileView user={user} onUpdate={(updated) => setUser({ ...user, ...updated })} />
        )}
      </main>

      {/* ─── MODALS ─── */}
      {showFarmModal && (
        <CreateFarmModal
          onClose={() => setShowFarmModal(false)}
          onSuccess={(farm) => {
            setShowFarmModal(false);
            setSuccessMsg(`Farm "${farm.farmName}" created!`);
            loadInitialData();
          }}
        />
      )}

      {showFieldModal && selectedFarmForField && (
        <CreateFieldModal
          farm={selectedFarmForField}
          onClose={() => setShowFieldModal(false)}
          onSuccess={() => {
            setShowFieldModal(false);
            setSuccessMsg("Field successfully added!");
            loadInitialData();
          }}
        />
      )}

      {showCropModal && (
        <CreateCropModal
          farms={farms}
          onClose={() => setShowCropModal(false)}
          onSuccess={(newCrop) => {
            setShowCropModal(false);
            setSuccessMsg(`Crop "${newCrop.cropName}" registered!`);
            loadInitialData();
            setSelectedCrop(newCrop);
          }}
        />
      )}

      {showTreatmentModal && selectedCrop && (
        <CreateTreatmentModal
          crop={selectedCrop}
          onClose={() => setShowTreatmentModal(false)}
          onSuccess={() => {
            setShowTreatmentModal(false);
            setSuccessMsg("Treatment logged successfully!");
            loadCropDetails(selectedCrop.id);
          }}
        />
      )}
    </div>
  );
}

// ─── AUTH SCREEN (LOGIN & REGISTER) ──────────────────────────────────────────

function AuthScreen({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [farmName, setFarmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (isRegister) {
        const res = await api.register({
          name,
          email,
          phone,
          password,
          location,
          farmName,
        });
        onLoginSuccess(res);
      } else {
        const res = await api.login(email, password);
        onLoginSuccess(res);
      }
    } catch (error) {
      setErr(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-3">
            <Sprout className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AgriCare AI Platform</h1>
          <p className="text-sm text-slate-500 mt-1">Smart Crop Health Monitoring & Diagnostic Engine</p>
        </div>

        {err && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / City</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Nashik"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Farm Name</label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Patel Organic Acres"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? "Create Account & Start" : "Sign In to Dashboard"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-600">
            {isRegister ? "Already registered?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setErr("");
              }}
              className="font-bold text-emerald-600 hover:text-emerald-700 underline ml-1"
            >
              {isRegister ? "Sign In" : "Register Now"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ──────────────────────────────────────────────────────────

function DashboardView({
  dashboard,
  crops,
  reminders,
  onSelectCrop,
  onScanNew,
  onAskChat,
  onRefresh,
  loading,
}) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 border border-emerald-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" /> AI-Powered Health Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome to Your Farm Health Center
          </h1>
          <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
            Monitor crop disease progression, compare visual observations across growth cycles, and receive explainable agronomical guidance.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={onScanNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-sm shadow-md transition-all"
            >
              <Camera className="w-4 h-4 text-emerald-700" /> Upload & Analyze Leaf
            </button>
            <button
              onClick={onAskChat}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/50 hover:bg-emerald-600/70 border border-emerald-400/30 text-white font-medium text-sm transition-all"
            >
              <MessageSquare className="w-4 h-4 text-emerald-300" /> Ask AI Agronomist
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Monitored Crops",
            value: dashboard?.totalCrops || crops.length || 0,
            icon: Leaf,
            color: "text-emerald-600 bg-emerald-50 border-emerald-200",
          },
          {
            title: "Healthy Crops",
            value: dashboard?.healthyCrops || 0,
            icon: CheckCircle2,
            color: "text-teal-600 bg-teal-50 border-teal-200",
          },
          {
            title: "Requiring Attention",
            value: (dashboard?.attentionCrops || 0) + (dashboard?.monitoringCrops || 0),
            icon: AlertTriangle,
            color: "text-amber-600 bg-amber-50 border-amber-200",
          },
          {
            title: "Upcoming Reminders",
            value: reminders.length,
            icon: Calendar,
            color: "text-blue-600 bg-blue-50 border-blue-200",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className={`p-2 rounded-xl border ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-3">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Crops Table + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitored Crops */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Crop Health Status</h2>
              <p className="text-xs text-slate-500">Live health indicators from recent AI scans</p>
            </div>
            <button
              onClick={onRefresh}
              className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {crops.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
              <Sprout className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No crops registered yet</p>
              <p className="text-xs text-slate-400 mt-1">Register a farm and field to start tracking crops</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {crops.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCrop(c)}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50 rounded-xl px-2.5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                      {c.cropName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{c.cropName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{c.variety || "Standard variety"}</span>
                        <span>•</span>
                        <span>{c.cropAgeDays ? `${c.cropAgeDays} days old` : "Recently planted"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(c.status)}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actionable Reminders / Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Scheduled Actions</h2>
                <p className="text-xs text-slate-500">Upcoming crop follow-ups & sprays</p>
              </div>
              <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                <Clock className="w-4 h-4" />
              </span>
            </div>

            {reminders.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">All checks completed</p>
                <p className="text-[11px] text-slate-400 mt-1">No urgent follow-up tasks pending</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.slice(0, 4).map((rem) => (
                  <div
                    key={rem.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="text-emerald-700 font-semibold">[{rem.cropName}]</span>
                        {rem.title}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rem.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={onScanNew}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Record New Observation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FARMS & FIELDS VIEW ─────────────────────────────────────────────────────

function FarmsView({ farms, onAddFarm, onAddField, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Farm & Field Management</h1>
          <p className="text-xs text-slate-500">Configure physical land parcels and agronomic zoning</p>
        </div>
        <button
          onClick={onAddFarm}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Farm</span>
        </button>
      </div>

      {farms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Farms Configured</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Add your primary farm to organize fields, crops, and soil monitoring.
          </p>
          <button
            onClick={onAddFarm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
          >
            <Plus className="w-4 h-4" /> Add Primary Farm
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {farms.map((farm) => (
            <div key={farm.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{farm.farmName}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {farm.location || "Location not specified"}, {farm.state || ""}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                  {farm.area ? `${farm.area} ${farm.areaUnit}` : "Standard Acreage"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-around text-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Fields</span>
                  <span className="text-slate-900 font-extrabold text-base">{farm.fieldCount || 0}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Crops</span>
                  <span className="text-slate-900 font-extrabold text-base">{farm.cropCount || 0}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  onClick={() => onAddField(farm)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field Partition</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CROPS VIEW ──────────────────────────────────────────────────────────────

function CropsView({
  crops,
  selectedCrop,
  onSelectCrop,
  onAddCrop,
  monitoringSessions,
  analysisDetail,
  onScanNow,
  onAddTreatment,
  onRefresh,
}) {
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Crop Health & Disease Monitor</h1>
          <p className="text-xs text-slate-500">Track longitudinal recovery, AI diagnoses, and symptoms</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddCrop}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> Register Crop
          </button>
          <button
            onClick={onScanNow}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Camera className="w-4 h-4" /> Run AI Diagnosis
          </button>
        </div>
      </div>

      {crops.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <Leaf className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Crops Registered</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Register your crops to begin tracking plant health and scheduling treatments.
          </p>
          <button
            onClick={onAddCrop}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
          >
            <Plus className="w-4 h-4" /> Register First Crop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Crop Selector Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2">
            <h3 className="text-xs uppercase font-bold text-slate-400 px-2 mb-2 tracking-wider">Your Crops</h3>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {crops.map((c) => {
                const isSelected = selectedCrop?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCrop(c)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-emerald-50/80 border-emerald-300 shadow-xs"
                        : "border-transparent hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{c.cropName}</span>
                      {getStatusBadge(c.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                      <span>{c.variety || "Standard"}</span>
                      <span>{c.totalSessions || 0} scans</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Crop Detail & AI Diagnosis Section */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCrop && (
              <>
                {/* Crop Info Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900">{selectedCrop.cropName}</h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {selectedCrop.variety || "General Variety"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Sown on {selectedCrop.sowingDate || "Unknown date"} • Age: {selectedCrop.cropAgeDays || 0} days
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={onAddTreatment}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5 text-rose-500" />
                        <span>Log Treatment</span>
                      </button>
                      <button
                        onClick={onScanNow}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>New Scan</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Latest Analysis Details */}
                  {analysisDetail ? (
                    <div className="mt-5 space-y-5">
                      {/* ── Diagnosis Header Row ── */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-700">Diagnosis:</span>
                          <span className="text-sm font-extrabold text-slate-900">
                            {analysisDetail.disease || "Healthy / No Infection"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-slate-500">
                            Confidence: <strong className="text-slate-800">{Math.round((analysisDetail.confidence || 0) * 100)}%</strong>
                          </span>
                          <span className="text-slate-500">
                            Severity: <strong className="text-slate-800">{analysisDetail.severityPercentage || 0}% ({analysisDetail.severity || "LOW"})</strong>
                          </span>
                          {/* Risk Band */}
                          {analysisDetail.riskBand && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                              analysisDetail.riskBand === "Critical" ? "bg-red-100 text-red-800 border-red-300" :
                              analysisDetail.riskBand === "High" ? "bg-orange-100 text-orange-800 border-orange-300" :
                              analysisDetail.riskBand === "Moderate" ? "bg-amber-100 text-amber-800 border-amber-300" :
                              "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}>
                              Risk: {analysisDetail.riskBand}
                            </span>
                          )}
                          {/* Trajectory */}
                          {analysisDetail.trajectory && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                              analysisDetail.trajectory === "WORSENING" ? "bg-red-100 text-red-700 border-red-200" :
                              analysisDetail.trajectory === "IMPROVING" ? "bg-teal-100 text-teal-700 border-teal-200" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {analysisDetail.trajectory === "WORSENING" ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : analysisDetail.trajectory === "IMPROVING" ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : null}
                              {analysisDetail.trajectory}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Grad-CAM Explainability Panel ── */}
                      {monitoringSessions[0]?.analysis?.gradcamUrl && (
                        <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
                          <h4 className="text-xs font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-violet-600" /> Grad-CAM Explainability Heatmap
                          </h4>
                          <p className="text-[11px] text-violet-700 leading-relaxed">
                            The heatmap highlights the leaf regions that most influenced the AI's disease diagnosis.
                            Warmer colors (red/yellow) indicate the highest-attention zones — where pathogenic lesions were detected.
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Original image */}
                            {monitoringSessions[0]?.imageUrls?.[0] && (
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Original Upload</p>
                                <img
                                  src={`${api.API_BASE}${monitoringSessions[0].imageUrls[0]}`}
                                  alt="Original leaf photo"
                                  className="w-full aspect-square object-cover rounded-xl border border-slate-200 shadow-xs"
                                />
                              </div>
                            )}
                            {/* Grad-CAM overlay */}
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider text-center">AI Attention Map</p>
                              <img
                                src={`${api.API_BASE}${monitoringSessions[0].analysis.gradcamUrl}`}
                                alt="Grad-CAM disease heatmap"
                                className="w-full aspect-square object-cover rounded-xl border border-violet-300 shadow-xs ring-2 ring-violet-400/30"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Symptoms & Possible Causes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-emerald-600" /> Observed Symptoms
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {analysisDetail.symptoms || "No visible symptoms detected."}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Likely Causes
                          </h4>
                          <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                            {analysisDetail.possibleCauses || "Ideal environmental conditions."}
                          </p>
                        </div>
                      </div>

                      {/* Step-by-Step Recommendations */}
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Actionable Agronomic Advisory
                        </h4>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {analysisDetail.recommendations || "Continue standard maintenance."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No visual observations recorded yet for this crop.</p>
                      <button
                        onClick={onScanNow}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                      >
                        Upload First Observation
                      </button>
                    </div>
                  )}
                </div>

                {/* Longitudinal Monitoring Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                  <h3 className="font-bold text-base text-slate-900 mb-4">Observation Timeline ({monitoringSessions.length})</h3>
                  {monitoringSessions.length === 0 ? (
                    <p className="text-xs text-slate-400">No timeline entries.</p>
                  ) : (
                    <div className="space-y-4">
                      {monitoringSessions.map((session, idx) => (
                        <div
                          key={session.id}
                          className="flex items-start gap-4 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                            #{monitoringSessions.length - idx}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-800">
                                {new Date(session.observationDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              {getStatusBadge(session.healthStatus)}
                            </div>
                            {session.analysis && (
                              <p className="text-xs text-slate-600 mt-1">
                                Detected: <strong>{session.analysis.disease || "Healthy"}</strong> • Severity: {session.analysis.severity || "LOW"}
                              </p>
                            )}
                            {session.notes && (
                              <p className="text-xs text-slate-500 italic mt-0.5">"{session.notes}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCAN & MONITOR VIEW (PHOTO UPLOAD) ───────────────────────────────────────

function ScanView({
  crops,
  selectedCropId,
  setSelectedCropId,
  uploadFiles,
  setUploadFiles,
  uploadNotes,
  setUploadNotes,
  uploading,
  onSubmitScan,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Crop Health Diagnostic Scan</h1>
        <p className="text-xs text-slate-500">Upload high-resolution leaf or plant photos for AI pathogen detection</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
        {/* Select Target Crop */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            1. Select Target Crop
          </label>
          <select
            value={selectedCropId}
            onChange={(e) => setSelectedCropId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- Choose a registered crop --</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cropName} ({c.variety || "General"}) - Field {c.fieldName || `#${c.fieldId}`}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Zone */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            2. Upload Leaf Photograph
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-8 text-center cursor-pointer transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {uploadFiles.length > 0
                ? `${uploadFiles.length} file(s) selected`
                : "Click or drag photos here"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG with clear focus on leaf symptoms</p>
          </div>

          {/* File names preview */}
          {uploadFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uploadFiles.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <Leaf className="w-3 h-3 text-emerald-600" />
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Farmer Observations */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            3. Field Notes / Symptoms Observed
          </label>
          <textarea
            rows={3}
            value={uploadNotes}
            onChange={(e) => setUploadNotes(e.target.value)}
            placeholder="e.g. Yellow spots appeared after 3 days of high humidity; lower leaves are starting to wilt..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={onSubmitScan}
          disabled={uploading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Analyzing Image with AI Engine...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Start Comprehensive AI Diagnosis</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── TREATMENTS VIEW ─────────────────────────────────────────────────────────

function TreatmentsView({
  crops,
  selectedCrop,
  setSelectedCrop,
  treatments,
  onAddTreatment,
  onRefresh,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Treatment & Remediation Log</h1>
          <p className="text-xs text-slate-500">Record fungicide, pesticide, or biological spray applications</p>
        </div>
        <button
          onClick={onAddTreatment}
          disabled={!selectedCrop}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Record Treatment
        </button>
      </div>

      {crops.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {crops.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCrop(c)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCrop?.id === c.id
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {c.cropName}
            </button>
          ))}
        </div>
      )}

      {treatments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Treatments Recorded</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Record recommended treatments to evaluate whether disease spread decreases in subsequent scans.
          </p>
          <button
            onClick={onAddTreatment}
            disabled={!selectedCrop}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs"
          >
            <Plus className="w-4 h-4" /> Log Treatment
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {treatments.map((t) => (
              <div key={t.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{t.treatmentType}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                      {t.productName || "General Formulation"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{t.treatmentDescription}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Applied on: {t.applicationDate || "N/A"} • Follow-up: {t.followUpDate || "None"}
                  </p>
                </div>
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 self-start sm:self-center">
                  Status: {t.result || "Applied"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REMINDERS VIEW ──────────────────────────────────────────────────────────

function RemindersView({ reminders, onCompleteReminder, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Crop Follow-Up Reminders</h1>
          <p className="text-xs text-slate-500">Scheduled checks generated automatically from AI diagnosis</p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Reminders Due</h3>
          <p className="text-xs text-slate-500 mt-1">All follow-ups and inspections are up to date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {rem.cropName}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(rem.reminderDate).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mt-2">{rem.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{rem.message}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => onCompleteReminder(rem.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Completed</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CHATBOT VIEW (AI ADVISOR) ───────────────────────────────────────────────

function ChatView({ crops, selectedCrop, messages, input, setInput, sending, onSendMessage }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickPrompts = [
    "How do I control early blight organically?",
    "What is the best NPK ratio for flowering tomatoes?",
    "How to prepare a neem oil foliar spray?",
    "Why are the lower leaves turning yellow?",
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-emerald-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">AgriCare AI Assistant</h2>
            <p className="text-xs text-slate-500">
              Context: {selectedCrop ? `${selectedCrop.cropName} (${selectedCrop.variety || "General"})` : "General Farm Crops"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Agricultural Knowledge Base</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Ask any question regarding crop diseases, organic fungicides, dosage precautions, irrigation frequencies, or weather impacts.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setInput(p)}
                  className="px-3 py-1.5 rounded-full text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-all text-slate-700"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                m.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-none"
                  : "bg-slate-100 text-slate-800 rounded-bl-none whitespace-pre-line"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-none p-3.5 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Analyzing query with agronomical engine...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask question about disease, dosage, or pest management..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── PROFILE VIEW ────────────────────────────────────────────────────────────

function ProfileView({ user, onUpdate }) {
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [location, setLocation] = useState(user.location || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({ name, phone, location });
      onUpdate({ name, phone, location });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xs p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Farmer Account Settings</h1>
        <p className="text-xs text-slate-500">Manage your farm identity and notification details</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            disabled
            value={user.email}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Region / Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? "Changes Saved!" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

// ─── MODAL COMPONENTS ────────────────────────────────────────────────────────

function CreateFarmModal({ onClose, onSuccess }) {
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("Acre");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createFarm({
        farmName,
        location,
        area: area ? parseFloat(area) : null,
        areaUnit,
      });
      onSuccess(res);
    } catch (err) {
      alert(err.message || "Failed to create farm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Add New Farm</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Farm Name</label>
            <input
              type="text"
              required
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g. Sunrise Valley Farm"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location / District</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Pune, Maharashtra"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Area</label>
              <input
                type="number"
                step="0.1"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
              <select
                value={areaUnit}
                onChange={(e) => setAreaUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Acre">Acre</option>
                <option value="Hectare">Hectare</option>
                <option value="Bigha">Bigha</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Farm</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateFieldModal({ farm, onClose, onSuccess }) {
  const [fieldName, setFieldName] = useState("");
  const [area, setArea] = useState("");
  const [soilType, setSoilType] = useState("Loamy");
  const [irrigationMethod, setIrrigationMethod] = useState("Drip");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createField({
        farmId: farm.id,
        fieldName,
        area: area ? parseFloat(area) : null,
        soilType,
        irrigationMethod,
      });
      onSuccess(res);
    } catch (err) {
      alert(err.message || "Failed to create field");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Add Field to {farm.farmName}</h3>
            <p className="text-xs text-slate-500">Partition land for dedicated crop planting</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Field Name / Plot #</label>
            <input
              type="text"
              required
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g. North Plot A"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Area (Acres)</label>
            <input
              type="number"
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="2.5"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Soil Type</label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Loamy">Loamy</option>
                <option value="Black Soil">Black Soil</option>
                <option value="Clay">Clay</option>
                <option value="Sandy">Sandy</option>
                <option value="Red Soil">Red Soil</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Irrigation</label>
              <select
                value={irrigationMethod}
                onChange={(e) => setIrrigationMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Drip">Drip Irrigation</option>
                <option value="Sprinkler">Sprinkler</option>
                <option value="Flood / Furrow">Flood / Furrow</option>
                <option value="Rainfed">Rainfed</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Field</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateCropModal({ farms, onClose, onSuccess }) {
  const [cropName, setCropName] = useState("Tomato");
  const [variety, setVariety] = useState("");
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().split("T")[0]);
  const [growthStage, setGrowthStage] = useState("Vegetative");
  const [farmId, setFarmId] = useState(farms.length > 0 ? farms[0].id : "");
  const [fields, setFields] = useState([]);
  const [fieldId, setFieldId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (farmId) {
      api.listFields(farmId).then((res) => {
        setFields(res || []);
        if (res && res.length > 0) setFieldId(res[0].id);
      });
    }
  }, [farmId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fieldId) {
      alert("Please select or create a field first!");
      return;
    }
    setLoading(true);
    try {
      const res = await api.createCrop({
        fieldId,
        cropName,
        variety,
        sowingDate,
        growthStage,
      });
      onSuccess(res);
    } catch (err) {
      alert(err.message || "Failed to register crop");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Register Monitored Crop</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Farm</label>
              <select
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.farmName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Field</label>
              <select
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.fieldName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Crop Type</label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              >
                <option value="Tomato">Tomato</option>
                <option value="Potato">Potato</option>
                <option value="Wheat">Wheat</option>
                <option value="Cotton">Cotton</option>
                <option value="Rice">Rice</option>
                <option value="Corn">Corn</option>
                <option value="Chilli">Chilli</option>
                <option value="Soybean">Soybean</option>
                <option value="Sugarcane">Sugarcane</option>
                <option value="Onion">Onion</option>
                <option value="Garlic">Garlic</option>
                <option value="Cabbage">Cabbage</option>
                <option value="Cauliflower">Cauliflower</option>
                <option value="Mustard">Mustard</option>
                <option value="Sunflower">Sunflower</option>
                <option value="Groundnut">Groundnut</option>
                <option value="Millet">Millet</option>
                <option value="Sorghum">Sorghum</option>
                <option value="Banana">Banana</option>
                <option value="Mango">Mango</option>
                <option value="Grapes">Grapes</option>
                <option value="Citrus">Citrus</option>
                <option value="Apple">Apple</option>
                <option value="Carrot">Carrot</option>
                <option value="Cucumber">Cucumber</option>
                <option value="Eggplant">Eggplant</option>
                <option value="Pumpkin">Pumpkin</option>
                <option value="Watermelon">Watermelon</option>
                <option value="Strawberry">Strawberry</option>
                <option value="Peas">Peas</option>
                <option value="Beans">Beans</option>
                <option value="Spinach">Spinach</option>
                <option value="Lettuce">Lettuce</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Variety</label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g. Roma / Hybrid"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sowing Date</label>
              <input
                type="date"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Growth Stage</label>
              <select
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              >
                <option value="Germination">Germination</option>
                <option value="Vegetative">Vegetative</option>
                <option value="Flowering">Flowering</option>
                <option value="Fruit Formation">Fruit Formation</option>
                <option value="Maturity">Maturity / Pre-Harvest</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Register Crop</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateTreatmentModal({ crop, onClose, onSuccess }) {
  const [treatmentType, setTreatmentType] = useState("Biological Fungicide");
  const [productName, setProductName] = useState("");
  const [treatmentDescription, setTreatmentDescription] = useState("");
  const [applicationDate, setApplicationDate] = useState(new Date().toISOString().split("T")[0]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createTreatment({
        cropId: crop.id,
        treatmentType,
        productName,
        treatmentDescription,
        applicationDate,
        followUpDate: followUpDate || null,
      });
      onSuccess(res);
    } catch (err) {
      alert(err.message || "Failed to log treatment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Log Treatment for {crop.cropName}</h3>
            <p className="text-xs text-slate-500">Record dosage, chemicals, or cultural intervention</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Treatment Category</label>
            <select
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            >
              <option value="Biological Fungicide">Biological Fungicide (Trichoderma / Bacillus)</option>
              <option value="Chemical Fungicide">Chemical Fungicide (Mancozeb / Copper Oxychloride)</option>
              <option value="Neem / Botanical Spray">Neem / Botanical Spray</option>
              <option value="Soil Drenching / Fertilizer">Soil Drenching / Fertilizer</option>
              <option value="Pruning / Sanitation">Pruning / Physical Sanitation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Formulation</label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Copper Oxychloride 50% WP @ 2.5g/L"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions / Notes</label>
            <textarea
              rows={2}
              value={treatmentDescription}
              onChange={(e) => setTreatmentDescription(e.target.value)}
              placeholder="e.g. Sprayed thoroughly over top and underside of leaves in early morning..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Application Date</label>
              <input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-Up</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Log Treatment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
