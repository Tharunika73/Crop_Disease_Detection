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
  AlertCircle,
  Shield,
  Globe,
  Users,
  Brain,
  Cpu,
  Database,
  ChevronDown,
  Eye,
  Volume2,
  Copy,
  RotateCcw,
  Bot,
  HelpCircle
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
                ...(user?.role === "admin" ? [{ id: "admin", label: "Admin Panel", icon: Shield }] : []),
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
            ...(user?.role === "admin" ? [{ id: "admin", label: "Admin", icon: Shield }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs whitespace-nowrap font-medium ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
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
            setSelectedCrop={setSelectedCrop}
            messages={chatMessages}
            setMessages={setChatMessages}
            input={chatInput}
            setInput={setChatInput}
            sending={chatSending}
            user={user}
            onSendMessage={async (overrideText) => {
              const textToSend = (typeof overrideText === "string" ? overrideText : chatInput).trim();
              if (!textToSend || chatSending) return;
              const userMsg = { role: "user", text: textToSend, timestamp: new Date() };
              const updatedHistory = [...chatMessages, userMsg];
              setChatMessages(updatedHistory);
              setChatInput("");
              setChatSending(true);
              try {
                const cropContext = selectedCrop ? (selectedCrop.cropName || selectedCrop.crop_name || selectedCrop.name || selectedCrop.crop_type || "Tomato") : null;
                const cropDetails = selectedCrop ? {
                  variety: selectedCrop.variety,
                  growth_stage: selectedCrop.growth_stage || selectedCrop.stage,
                  health_status: selectedCrop.health_status,
                  severity: selectedCrop.severity,
                } : null;

                const historyPayload = updatedHistory.slice(-8).map((m) => ({
                  role: m.role === "user" ? "user" : "assistant",
                  content: m.text,
                }));

                const res = await api.askChatbot(
                  textToSend,
                  cropContext,
                  historyPayload,
                  cropDetails,
                  user?.location || null
                );

                const botMsg = {
                  role: "bot",
                  text: res.answer,
                  suggestions: res.suggestions || [],
                  model: res.model || "AgriCare AI Advisor",
                  explainable: res.explainable !== false,
                  timestamp: new Date(),
                };
                setChatMessages((prev) => [...prev, botMsg]);
              } catch (err) {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    role: "bot",
                    text: "I apologize, but I encountered an issue retrieving the advisory. Please check your connectivity and try asking again.",
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

        {activeTab === "admin" && user?.role === "admin" && (
          <AdminDashboardView />
        )}

        {activeTab === "admin" && user?.role !== "admin" && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Shield className="w-16 h-16 mb-4 text-slate-300" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-sm">You need admin privileges to access this section.</p>
          </div>
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

function ChatView({
  crops,
  selectedCrop,
  setSelectedCrop,
  messages,
  setMessages,
  input,
  setInput,
  sending,
  user,
  onSendMessage,
}) {
  const messagesEndRef = useRef(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [speakingIdx, setSpeakingIdx] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleCopy = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSpeak = (text, idx) => {
    if (!window.speechSynthesis) return;
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner voice speech
    const cleanSpeech = text
      .replace(/[#*_`]/g, "")
      .replace(/\[SUGGESTION\].*$/gm, "")
      .trim();
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const starterTopics = [
    {
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      title: "Disease Diagnostics",
      desc: "Understand symptoms, pathogen biology & why spots appear",
      prompt: "Why are my lower leaves developing yellow rings and dark spots?",
    },
    {
      icon: Sparkles,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      title: "Organic & Bio Sprays",
      desc: "Neem oil, bio-fungicides & preventive plant immunity",
      prompt: "How do I prepare a neem oil foliar spray and what is the exact dosage?",
    },
    {
      icon: Droplets,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      title: "Water & Irrigation",
      desc: "Drip schedules, soil moisture & root hypoxia prevention",
      prompt: "How does drip irrigation prevent fungal disease spread?",
    },
    {
      icon: Leaf,
      color: "text-teal-600 bg-teal-50 border-teal-200",
      title: "NPK & Nutrition",
      desc: "Balanced fertilizer dosing for vegetative & flowering stages",
      prompt: "What is the best NPK fertilizer schedule for flowering and fruit set?",
    },
  ];

  const renderFormattedMessage = (content) => {
    if (!content) return null;
    const lines = content.split("\n");
    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={lIdx} className="font-bold text-slate-900 mt-2.5 mb-1 text-sm sm:text-base border-b border-slate-200/60 pb-1">
                {trimmed.replace("### ", "")}
              </h4>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h3 key={lIdx} className="font-bold text-emerald-800 mt-3 mb-1 text-base">
                {trimmed.replace("## ", "")}
              </h3>
            );
          }
          if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
            const bulletText = trimmed.replace(/^[•\-]\s*/, "");
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-1">
                <span className="text-emerald-600 font-bold">•</span>
                <span>{renderInlineBold(bulletText)}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(trimmed)) {
            const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-1">
                <span className="font-bold text-emerald-700 min-w-4">{numMatch[1]}.</span>
                <span>{renderInlineBold(numMatch[2])}</span>
              </div>
            );
          }
          if (!trimmed) {
            return <div key={lIdx} className="h-1" />;
          }
          return <p key={lIdx}>{renderInlineBold(trimmed)}</p>;
        })}
      </div>
    );
  };

  const renderInlineBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const activeCropName = selectedCrop
    ? selectedCrop.cropName || selectedCrop.crop_name || selectedCrop.name || selectedCrop.crop_type || "Selected Crop"
    : null;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-slate-900">AgriCare Personal Agronomist</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3 h-3" /> Explainable AI
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Personalized agricultural companion & scientific disease advisory
            </p>
          </div>
        </div>

        {/* Crop Context Dropdown & Clear */}
        <div className="flex items-center gap-2">
          {crops && crops.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <select
                value={selectedCrop?.id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSelectedCrop(null);
                  } else {
                    const found = crops.find((c) => String(c.id) === String(val));
                    setSelectedCrop(found || null);
                  }
                }}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="">All Crops (General)</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cropName || c.crop_name || c.name} {c.variety ? `(${c.variety})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Start a new conversation session?")) {
                  setMessages([]);
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                  setSpeakingIdx(null);
                }
              }}
              title="Reset Conversation"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/40">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-sm">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">
                Hello{user?.name ? `, ${user.name}` : ""}! I'm your Personal Agronomist.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
                I don't just provide raw data — I explain the <strong>biological causes ("why it happens")</strong> behind symptoms and create step-by-step treatment protocols tailored for your {activeCropName || "crops"}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {starterTopics.map((item, i) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onSendMessage(item.prompt)}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm text-left transition-all group flex items-start gap-3"
                  >
                    <div className={`p-2.5 rounded-xl border ${item.color} shrink-0`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5 items-start`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-2xl rounded-2xl p-4 shadow-2xs space-y-2.5 ${
                isUser
                  ? "bg-emerald-600 text-white rounded-br-none"
                  : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
              }`}>
                {/* Assistant header badges */}
                {!isUser && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {m.model || "AgriCare AI Advisor"}
                      </span>
                      {m.explainable && (
                        <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Explainable Diagnosis
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        onClick={() => handleSpeak(m.text, idx)}
                        title={speakingIdx === idx ? "Stop speaking" : "Read aloud"}
                        className={`p-1 rounded hover:bg-slate-100 transition-colors ${speakingIdx === idx ? "text-emerald-600" : "hover:text-slate-700"}`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopy(m.text, idx)}
                        title="Copy to clipboard"
                        className="p-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Content */}
                {isUser ? (
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                ) : (
                  renderFormattedMessage(m.text)
                )}

                {/* Follow-up suggestions */}
                {!isUser && m.suggestions && m.suggestions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-emerald-600" /> Recommended Follow-up Questions:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => onSendMessage(sug)}
                          className="px-2.5 py-1 rounded-full text-[11px] bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-all text-left flex items-center gap-1"
                        >
                          <span>{sug}</span>
                          <ArrowRight className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="flex justify-start gap-2.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none p-4 text-xs text-slate-600 flex items-center gap-2.5 border border-slate-200 shadow-2xs">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Formulating agronomic explanation and management protocol...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-2">
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
            placeholder={`Ask your personal agronomist about symptoms, dosage, or care for ${activeCropName || "crops"}...`}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all shadow-xs flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Explainable AI • Mechanistic pathology insights • Organic & chemical guides</span>
          <span>Press Enter to send</span>
        </div>
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

// ─── ADMIN DASHBOARD VIEW ────────────────────────────────────────────────────

function AdminDashboardView() {
  const [activeSection, setActiveSection] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [regions, setRegions] = useState([]);
  const [alerts, setAlerts] = useState({ outbreaks: [], new_diseases: [], total_alerts: 0 });
  const [farmers, setFarmers] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [datasetStats, setDatasetStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionDetail, setRegionDetail] = useState(null);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [farmerCrops, setFarmerCrops] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [trainArch, setTrainArch] = useState("mobilenetv2");
  const [trainEpochs, setTrainEpochs] = useState(20);
  const [filterRegion, setFilterRegion] = useState("");
  const [searchFarmer, setSearchFarmer] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [sum, reg, alrt, farm, model, ds] = await Promise.allSettled([
        api.getAdminSummary(),
        api.getAdminRegions(),
        api.getAdminAlerts(),
        api.getAdminFarmers(),
        api.getAdminModelInfo(),
        api.getDatasetStats(),
      ]);
      if (sum.status === "fulfilled") setSummary(sum.value);
      if (reg.status === "fulfilled") setRegions(reg.value || []);
      if (alrt.status === "fulfilled") setAlerts(alrt.value || { outbreaks: [], new_diseases: [], total_alerts: 0 });
      if (farm.status === "fulfilled") setFarmers(farm.value || []);
      if (model.status === "fulfilled") setModelInfo(model.value);
      if (ds.status === "fulfilled") setDatasetStats(ds.value);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadRegionDetail = async (region) => {
    setSelectedRegion(region);
    try {
      const detail = await api.getRegionDiseases(region);
      setRegionDetail(detail);
    } catch (e) {
      setRegionDetail(null);
    }
  };

  const loadFarmerCrops = async (farmer) => {
    setSelectedFarmer(farmer);
    try {
      const data = await api.getFarmerCrops(farmer.id);
      setFarmerCrops(data);
    } catch (e) {
      setFarmerCrops(null);
    }
  };

  const handleTrainModel = async () => {
    try {
      const res = await api.triggerModelTraining(trainArch, trainEpochs);
      setTrainingStatus({ type: "success", message: res.message, details: res });
    } catch (e) {
      setTrainingStatus({ type: "error", message: e.message });
    }
  };

  const filteredFarmers = farmers.filter((f) => {
    const matchRegion = filterRegion ? (f.region || "").toLowerCase().includes(filterRegion.toLowerCase()) : true;
    const matchSearch = searchFarmer ? (f.name || "").toLowerCase().includes(searchFarmer.toLowerCase()) : true;
    return matchRegion && matchSearch;
  });

  // Severity color mapping
  const getSeverityColor = (sev) => {
    if (sev >= 35) return "bg-rose-500";
    if (sev >= 15) return "bg-orange-400";
    if (sev > 0) return "bg-amber-400";
    return "bg-emerald-400";
  };

  const getSeverityBg = (sev) => {
    if (sev >= 35) return "bg-rose-50 border-rose-200 text-rose-800";
    if (sev >= 15) return "bg-orange-50 border-orange-200 text-orange-800";
    if (sev > 0) return "bg-amber-50 border-amber-200 text-amber-800";
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  };

  const sections = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "regions", label: "Disease Map", icon: Globe },
    { id: "alerts", label: `Alerts ${alerts.total_alerts > 0 ? `(${alerts.total_alerts})` : ""}`, icon: Bell },
    { id: "farmers", label: "Farmers", icon: Users },
    { id: "ai", label: "AI & Training", icon: Brain },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Admin Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <Shield className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Control Panel</h1>
              <p className="text-sm text-slate-500">AgriCare Platform — Disease Intelligence &amp; Management</p>
            </div>
          </div>
          <button
            onClick={loadAllData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            Refresh Data
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── OVERVIEW SECTION ── */}
      {activeSection === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Farmers", value: summary?.total_farmers ?? "–", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Total Scans", value: summary?.total_scans ?? "–", icon: Camera, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
              { label: "Crops Registered", value: summary?.total_crops ?? "–", icon: Leaf, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100" },
              { label: "Active Outbreaks", value: summary?.active_outbreaks ?? "–", icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
              { label: "New Disease Alerts", value: summary?.new_disease_alerts ?? "–", icon: Bell, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
              { label: "Affected Regions", value: summary?.affected_regions ?? "–", icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className={`rounded-2xl p-4 border ${kpi.bg} ${kpi.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{kpi.value}</div>
                  <div className="text-xs mt-1 text-slate-600">{kpi.label}</div>
                </div>
              );
            })}
          </div>

          {/* Top Diseases & Scan Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Diseases */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" /> Top Diseases Platform-wide
              </h3>
              {(summary?.top_diseases || []).length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No disease data yet. Start scanning crops!</p>
              ) : (
                <div className="space-y-4">
                  {(summary?.top_diseases || []).map((d, i) => {
                    const maxCount = Math.max(...(summary?.top_diseases || [{ count: 1 }]).map((x) => x.count));
                    const pct = Math.round((d.count / maxCount) * 100);
                    return (
                      <div key={d.disease}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-slate-700">{d.disease}</span>
                          <span className="text-slate-500 font-medium">{d.count} cases</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scan Trend */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> 7-Day Scan Activity
              </h3>
              {(summary?.scan_trend || []).every((d) => d.scans === 0) ? (
                <p className="text-slate-500 text-sm text-center py-8">No scans recorded in the past 7 days.</p>
              ) : (
                <div className="flex items-end gap-2 h-36 pt-4">
                  {(summary?.scan_trend || []).map((day) => {
                    const maxScans = Math.max(...(summary?.scan_trend || [{ scans: 1 }]).map((x) => x.scans), 1);
                    const barH = Math.round((day.scans / maxScans) * 100);
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity -mb-1">{day.scans}</span>
                        <div
                          className="w-full rounded-t-md transition-all bg-emerald-100 group-hover:bg-emerald-300"
                          style={{ height: `${Math.max(barH, 4)}%` }}
                        />
                        <span className="text-[10px] font-medium text-slate-500">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REGION DISEASE MAP ── */}
      {activeSection === "regions" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-2">
            <Globe className="w-6 h-6 text-emerald-600" /> Area-Wise Disease Heatmap
          </h2>
          {regions.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
              <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No regional data available yet. Farmers must set their region/location when registering.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Region List */}
              <div className="lg:col-span-1 space-y-3">
                {regions.sort((a, b) => b.avg_severity - a.avg_severity).map((r) => (
                  <div
                    key={r.region}
                    onClick={() => loadRegionDetail(r.region)}
                    className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                      selectedRegion === r.region 
                        ? "bg-emerald-50 border-emerald-300 shadow-sm" 
                        : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className={`w-4 h-4 ${selectedRegion === r.region ? "text-emerald-600" : "text-slate-400"}`} /> 
                        {r.region}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        {r.total_scans} scans
                      </span>
                    </div>
                    {r.top_disease && (
                      <div className="text-sm text-rose-600 font-medium mb-2.5">⚠ Top: {r.top_disease}</div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(r.avg_severity * 2, 100)}%`,
                            background: r.avg_severity >= 35 ? "#ef4444" : r.avg_severity >= 15 ? "#f97316" : "#fbbf24",
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Avg {r.avg_severity}% sev</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Region Disease Detail */}
              <div className="lg:col-span-2">
                {!selectedRegion ? (
                  <div className="bg-white rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center border border-dashed border-slate-300">
                    <Eye className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Select a region to see detailed disease breakdown</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" /> {selectedRegion}
                    </h3>
                    <p className="text-slate-500 text-sm mb-6 font-medium">{regionDetail?.total_scans || 0} total scans in this region</p>
                    
                    {!regionDetail ? (
                      <div className="text-center py-12 text-slate-500 font-medium flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" /> Loading details...
                      </div>
                    ) : regionDetail.diseases.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">No disease data for this region.</div>
                    ) : (
                      <div className="space-y-4">
                        {regionDetail.diseases.map((d, i) => (
                          <div key={d.disease} className={`rounded-xl p-5 border ${
                            d.disease === "Healthy" ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
                          }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <span className="font-bold text-slate-800 text-base">{d.disease}</span>
                                {i === 0 && d.disease !== "Healthy" && (
                                  <span className="ml-3 text-xs font-bold px-2 py-1 rounded-md bg-rose-100 text-rose-700">MOST AFFECTED</span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-slate-800 font-bold text-lg">{d.percentage}%</div>
                                <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">{d.count} cases</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm bg-white/60 p-3 rounded-lg">
                              <div>
                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Avg Severity</span>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(d.avg_severity * 2, 100)}%`, background: d.avg_severity >= 35 ? "#ef4444" : d.avg_severity >= 15 ? "#f97316" : "#10b981" }} />
                                  </div>
                                  <span className="text-slate-700 font-bold">{d.avg_severity}%</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Last Detected</span>
                                <div className="text-slate-800 font-medium mt-1.5">
                                  {d.last_seen ? new Date(d.last_seen).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ALERTS SECTION ── */}
      {activeSection === "alerts" && (
        <div className="space-y-8">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-2">
            <Bell className="w-6 h-6 text-amber-500" /> Disease Alerts &amp; Outbreaks
          </h2>

          {/* Outbreak Alerts */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">🚨 Active Outbreaks</h3>
            {alerts.outbreaks.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                <p className="text-slate-600 font-medium">No active outbreaks detected. All regions are within safe thresholds.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.outbreaks.map((o, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 border border-rose-100">
                        <AlertTriangle className="w-6 h-6 text-rose-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 text-lg leading-tight">{o.disease}</div>
                        <div className="text-slate-500 text-sm flex items-center gap-1.5 mt-1 font-medium">
                          <MapPin className="w-4 h-4 text-slate-400" /> {o.region}
                        </div>
                        <div className="mt-4 flex gap-6">
                          <div>
                            <div className="text-2xl font-black text-rose-600 leading-none">{o.case_count}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Cases</div>
                          </div>
                          <div>
                            <div className="text-2xl font-black text-slate-300 leading-none">{o.threshold}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Threshold</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Disease Alerts */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">🔬 Newly Detected Diseases (Last 14 Days)</h3>
            {alerts.new_diseases.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-blue-500" />
                <p className="text-slate-600 font-medium">No new diseases detected in any region in the past 14 days.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.new_diseases.map((nd, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-100">
                        <Sparkles className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 text-lg leading-tight">{nd.disease}</div>
                        <div className="text-slate-500 text-sm flex items-center gap-1.5 mt-1 font-medium">
                          <MapPin className="w-4 h-4 text-slate-400" /> {nd.region}
                        </div>
                        <div className="mt-3 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">{nd.message}</div>
                        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>First seen: {nd.first_seen ? new Date(nd.first_seen).toLocaleDateString() : "—"}</span>
                          <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600">{nd.case_count} case{nd.case_count !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FARMERS SECTION ── */}
      {activeSection === "farmers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 px-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-500" /> Farmer Management
            </h2>
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search farmer name..."
                  value={searchFarmer}
                  onChange={(e) => setSearchFarmer(e.target.value)}
                  className="pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-900 bg-white border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm w-48 lg:w-64"
                />
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by region..."
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-900 bg-white border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm w-48 lg:w-64"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Farmer Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-slate-600 text-sm font-semibold">{filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? "s" : ""} found</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {filteredFarmers.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-medium">No farmers match the current filter.</div>
                  ) : (
                    filteredFarmers.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => loadFarmerCrops(f)}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedFarmer?.id === f.id ? "bg-emerald-50/50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-emerald-600 shadow-sm flex-shrink-0">
                            {(f.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 truncate">{f.name}</div>
                            <div className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {f.region || "No region set"}
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-slate-800 font-bold">{f.crop_count}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Crops</div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-800 font-bold">{f.scan_count}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Scans</div>
                            </div>
                          </div>
                        </div>
                        {f.last_scan && (
                          <div className="mt-3 ml-14 text-xs font-medium text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded-md">
                            Last scan: {new Date(f.last_scan).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Farmer Detail Panel */}
            <div className="lg:col-span-1">
              {!selectedFarmer ? (
                <div className="bg-white rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center border border-dashed border-slate-300">
                  <UserIcon className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">Select a farmer to view their profile and crops</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl bg-emerald-600 shadow-md">
                      {(selectedFarmer.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-slate-900">{selectedFarmer.name}</div>
                      <div className="text-sm font-medium text-slate-500">{selectedFarmer.email}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {[
                      { label: "Region", value: selectedFarmer.region || "—", icon: MapPin },
                      { label: "Phone", value: selectedFarmer.phone || "—", icon: UserIcon },
                      { label: "Soil Type", value: selectedFarmer.soil_type || "—", icon: Database },
                      { label: "Field Size", value: selectedFarmer.field_size ? `${selectedFarmer.field_size} ha` : "—", icon: Layers },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 text-sm">
                        <item.icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-slate-500 font-medium w-20">{item.label}:</span>
                        <span className="text-slate-800 font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 mb-3 border-t border-slate-100 pt-5">Registered Crops</h4>
                  {!farmerCrops ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" /> Loading...
                    </div>
                  ) : farmerCrops.crops.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4 bg-slate-50 rounded-lg">No crops registered.</p>
                  ) : (
                    <div className="space-y-3">
                      {farmerCrops.crops.map((c) => (
                        <div key={c.crop_id} className="rounded-xl p-3 border border-slate-200 bg-white hover:border-emerald-200 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">{c.crop}</span>
                            {c.latest_scan && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                c.latest_scan.risk_band === "HIGH" ? "bg-rose-100 text-rose-700" :
                                c.latest_scan.risk_band === "MODERATE" ? "bg-orange-100 text-orange-700" :
                                "bg-emerald-100 text-emerald-700"
                              }`}>{c.latest_scan.risk_band}</span>
                            )}
                          </div>
                          {c.latest_scan ? (
                            <div className="text-xs font-medium text-slate-500 flex justify-between items-center bg-slate-50 p-2 rounded-lg mt-2">
                              <span className="truncate max-w-[120px]" title={c.latest_scan.disease}>{c.latest_scan.disease}</span>
                              <span className="font-bold text-slate-700">{c.latest_scan.severity}% sev</span>
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-slate-400 mt-2">No scans recorded</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI & TRAINING SECTION ── */}
      {activeSection === "ai" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-2">
            <Brain className="w-6 h-6 text-teal-600" /> AI Model &amp; Training
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full">
              <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-500" /> Deployed Model Status
              </h3>
              {!modelInfo ? (
                <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" /> Loading model info...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Architecture", value: modelInfo.architecture, icon: Brain },
                      { label: "Status", value: modelInfo.status, icon: Activity },
                      { label: "Accuracy", value: `${modelInfo.accuracy_pct}%`, icon: CheckCircle2 },
                      { label: "Top-3 Accuracy", value: `${modelInfo.top3_accuracy_pct}%`, icon: Layers },
                      { label: "Avg Latency", value: `${modelInfo.avg_inference_latency_ms}ms`, icon: Clock },
                      { label: "Input Size", value: modelInfo.input_resolution, icon: Camera },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl p-4 bg-slate-50 border border-slate-100 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          <item.icon className="w-3.5 h-3.5 text-emerald-600" /> {item.label}
                        </div>
                        <div className="text-lg font-black text-slate-800">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Supported Disease Classes ({modelInfo.supported_classes?.length || 0})</div>
                    <div className="flex flex-wrap gap-2">
                      {(modelInfo.supported_classes || []).map((cls) => (
                        <span key={cls} className="text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-sm">{cls}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-500 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Explainability Engine: <span className="font-bold text-slate-700">{modelInfo.explainability_engine}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Training Trigger */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" /> Train Custom AI Model
              </h3>

              {/* Dataset Stats */}
              {datasetStats?.available && (
                <div className="rounded-xl p-4 mb-6 bg-emerald-50 border border-emerald-100">
                  <div className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Local Dataset Detected
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center shadow-sm">
                      <div className="text-2xl font-black text-emerald-700">{datasetStats.total_classes}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Classes</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center shadow-sm">
                      <div className="text-2xl font-black text-emerald-700">{datasetStats.total_images.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Images</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center shadow-sm">
                      <div className="text-2xl font-black text-emerald-700">{[...new Set((datasetStats.classes || []).map((c) => c.crop))].length}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Crops</div>
                    </div>
                  </div>
                </div>
              )}
              {datasetStats && !datasetStats.available && (
                <div className="rounded-xl p-4 mb-6 bg-amber-50 border border-amber-200 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm font-medium text-amber-800">Dataset not found. To enable model training, place your `<code className="bg-white px-1 py-0.5 rounded border border-amber-200 font-mono text-xs">Dataset/</code>` folder at the project root directory.</div>
                </div>
              )}

              <div className="space-y-5 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Model Architecture</label>
                  <select
                    value={trainArch}
                    onChange={(e) => setTrainArch(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                    disabled={!datasetStats?.available}
                  >
                    <option value="mobilenetv2">MobileNetV2 (Fastest, Mobile-Friendly)</option>
                    <option value="efficientnetb0">EfficientNetB0 (Balanced Accuracy/Speed)</option>
                    <option value="resnet50">ResNet50 (Highest Accuracy, Larger Size)</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Training Epochs</label>
                    <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{trainEpochs}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={trainEpochs}
                    onChange={(e) => setTrainEpochs(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    disabled={!datasetStats?.available}
                  />
                  <div className="flex justify-between text-xs font-medium text-slate-400 mt-2">
                    <span>5 (Fast Draft)</span>
                    <span>50 (Recommended)</span>
                    <span>100 (Deep Train)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleTrainModel}
                disabled={!datasetStats?.available || loading}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                  datasetStats?.available 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Brain className="w-5 h-5" /> Initialize Training Job
              </button>

              {trainingStatus && (
                <div className={`mt-4 rounded-xl p-4 text-sm font-medium flex items-start gap-3 border ${
                  trainingStatus.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {trainingStatus.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
                  <div>
                    {trainingStatus.message}
                    {trainingStatus.details && (
                      <div className="text-xs mt-2 text-slate-600 bg-white/50 p-2 rounded border border-slate-200/50 space-y-1 font-mono">
                        <div>Dataset: {trainingStatus.details.dataset}</div>
                        <div>Output: {trainingStatus.details.output_dir}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dataset Class Breakdown */}
          {datasetStats?.available && datasetStats.classes?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" /> Dataset Directory Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {datasetStats.classes.map((cls) => (
                  <div key={cls.class_name} className="rounded-xl p-4 border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        cls.disease.toLowerCase().includes("healthy") ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      }`}>
                        <Leaf className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{cls.crop}</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 truncate mb-2 px-1" title={cls.disease}>{cls.disease}</div>
                    <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md inline-flex items-center gap-1.5 border border-slate-200">
                      <Camera className="w-3 h-3 text-slate-400" /> {cls.image_count} images
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
