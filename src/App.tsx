import React, { useState, useEffect } from "react";
import { 
  Users, 
  PlusCircle, 
  BookOpen, 
  Database, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Phone, 
  Mail, 
  Edit3, 
  Trash2, 
  MapPin, 
  Wifi, 
  HardDrive, 
  MoreVertical,
  ChevronLeft,
  CheckCircle,
  FileText,
  Clock,
  Briefcase
} from "lucide-react";
import { Client, Transaction, DbConfig, DbStatus, DashboardStats as StatsType } from "./types";
import DashboardStats from "./components/DashboardStats";
import ClientForm from "./components/ClientForm";
import TransactionForm from "./components/TransactionForm";
import AccountStatement from "./components/AccountStatement";
import DatabaseSettings from "./components/DatabaseSettings";
import PinLogin from "./components/PinLogin";
import UserLogSettings from "./components/UserLogSettings";
import DatabaseConnGate from "./components/DatabaseConnGate";
import { LogOut, History, ShieldAlert, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'statements' | 'users_logs' | 'settings'>('dashboard');

  // Active User session
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; role: 'admin' | 'staff' } | null>(() => {
    const saved = localStorage.getItem("mosir_logged_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Safe fetch wrapper that automatically appends user headers
  const appFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers || {});
    if (currentUser) {
      if (!headers.has("x-user-id")) {
        headers.append("x-user-id", currentUser.id.toString());
      }
      if (!headers.has("x-username")) {
        headers.append("x-username", encodeURIComponent(currentUser.username));
      }
    }
    return fetch(input, { ...init, headers });
  };

  // Core Data States
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<StatsType>({ totalClients: 0, totalDebts: 0, totalPayments: 0, remainingBalance: 0 });
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null);
  
  // Custom staff permissions state
  const [staffPermissions, setStaffPermissions] = useState<any>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [debtFilter, setDebtFilter] = useState<'all' | 'has_debt' | 'settled'>('all');

  // Loading States
  const [loadingData, setLoadingData] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Modals management
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedClientIdForTrans, setSelectedClientIdForTrans] = useState<number | null>(null);

  // Statement navigation helper
  const [selectedClientIdForStatement, setSelectedClientIdForStatement] = useState<number | null>(null);

  const triggerFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // API Call: Fetch staff permissions matrix
  const fetchStaffPermissions = async () => {
    try {
      const res = await appFetch("/api/roles/permissions");
      if (res.ok) {
        const data = await res.json();
        setStaffPermissions(data);
      }
    } catch (err) {
      console.error("Failed to fetch staff permissions from main server", err);
    }
  };

  // Permission Guard Helper
  const canDo = (permissionKey: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (!staffPermissions) return true; // fallback
    return !!staffPermissions[permissionKey];
  };

  // API Call: Fetch status and config
  const fetchDbConfig = async () => {
    try {
      const resStatus = await appFetch("/api/db/status");
      const dataStatus = await resStatus.json();
      setDbStatus(dataStatus);

      const resConfig = await appFetch("/api/db/config");
      const dataConfig = await resConfig.json();
      setDbConfig(dataConfig);
    } catch (err) {
      console.error("Failed to fetch database settings", err);
    }
  };

  // API Call: Load Core Data
  const loadCoreData = async () => {
    setLoadingData(true);
    try {
      // Parallel fetches for speed
      const [clientsRes, transRes, statsRes] = await Promise.all([
        appFetch("/api/clients"),
        appFetch("/api/transactions"),
        appFetch("/api/stats")
      ]);

      if (clientsRes.ok && transRes.ok && statsRes.ok) {
        const clientsData = await clientsRes.json();
        const transData = await transRes.json();
        const statsData = await statsRes.json();

        setClients(clientsData);
        setTransactions(transData);
        setStats(statsData);
      } else {
        triggerFeedback('error', 'حدث خطأ أثناء الاتصال بالخادم لجلب البيانات الجارية.');
      }
    } catch (err) {
      console.error("Error loading core accounts context", err);
      triggerFeedback('error', 'فشل الاتصال اللحظي بالخادم الخلفي.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchDbConfig();
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
      loadCoreData();
      fetchStaffPermissions();
    }
  }, [currentUser]);

  // Update DB config dynamically
  const handleUpdateDbConfig = async (newConfig: DbConfig) => {
    try {
      const res = await appFetch("/api/db/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      setDbStatus(data.status);
      setDbConfig(data.config);
      
      // Reload core dataset with context of new adapter
      await loadCoreData();

      if (data.status.connected && data.status.type === "mysql") {
        triggerFeedback('success', 'تم الاتصال الفعلي بسيرفر MySQL بنجاح ومزامنة البيانات!');
      } else if (!data.status.connected && newConfig.type === "mysql") {
        triggerFeedback('error', 'فشل توصيل MySQL. تم تفعيل التخزين الاحتياطي المحلي التلقائي بنجاح.');
      } else {
        triggerFeedback('success', 'تم التحول بنجاح لوضع التخزين المحلي الآمن.');
      }
      return data.status;
    } catch (err: any) {
      triggerFeedback('error', 'عجز الاتصال بمدخل البرمجة الخلفي للمخدم.');
      throw err;
    }
  };

  // API Call: Save Client (Create or Update)
  const handleSaveClient = async (clientData: Omit<Client, "id" | "createdAt">) => {
    const isEditing = !!editingClient;
    
    if (isEditing && !canDo('edit_client')) {
      triggerFeedback('error', 'عذراً، صلاحية تعديل بيانات العملاء مقيدة في حسابك.');
      return;
    }
    if (!isEditing && !canDo('add_client')) {
      triggerFeedback('error', 'عذراً، صلاحية إضافة وتسجيل عملاء جدد معلقة في حسابك.');
      return;
    }

    const url = isEditing ? `/api/clients/${editingClient.id}` : "/api/clients";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await appFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData)
      });

      if (res.ok) {
        triggerFeedback('success', isEditing ? 'تم تحديث بيانات العميل بنجاح!' : 'تم إضافة عميل جديد بنجاح!');
        loadCoreData();
      } else {
        const errData = await res.json();
        triggerFeedback('error', errData.error || 'فشل حفظ العميل.');
      }
    } catch (err) {
      triggerFeedback('error', 'حدث عطل أثناء الاتصال بالخادم لحفظ العميل.');
    }
  };

  // API Call: Delete Client
  const handleDeleteClient = async (id: number) => {
    if (!canDo('delete_client')) {
      triggerFeedback('error', 'عذراً، صلاحية شطب وإزالة الغطاء المالي للعملاء مقيدة في حسابك.');
      return;
    }

    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا العميل نهائياً؟ هذا الإجراء سيؤدي لحذف كافة ديونه وسجل مدفوعاته بالكامل!")) {
      return;
    }

    try {
      const res = await appFetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerFeedback('success', 'تم حذف العميل وكامل معاملاته الحسابية بنجاح.');
        loadCoreData();
      } else {
        triggerFeedback('error', 'فشل إجراء عملية الحذف.');
      }
    } catch (err) {
      triggerFeedback('error', 'حدث خطأ متعلق بشبكة الاتصال.');
    }
  };

  // API Call: Register Debt / Payment Transaction
  const handleSaveTransaction = async (transData: {
    clientId: number;
    type: 'debt' | 'payment';
    amount: number;
    date: string;
    description: string;
  }) => {
    if (transData.type === 'payment' && !canDo('add_payment')) {
      triggerFeedback('error', 'عذراً، صلاحية تسجيل سندات التحصيل والدفعات مقيدة في حسابك.');
      return;
    }
    if (transData.type === 'debt' && !canDo('add_debt')) {
      triggerFeedback('error', 'عذراً، صلاحية قيد ديون جديدة مقيدة في حسابك بواسطة الإدارة.');
      return;
    }

    try {
      const res = await appFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transData)
      });

      if (res.ok) {
        triggerFeedback('success', transData.type === 'debt' ? 'تم تسجيل مبلغ الدين الجديد بنجاح.' : 'تم قيد الدفعة النقدية بنجاح.');
        loadCoreData();
      } else {
        const errData = await res.json();
        triggerFeedback('error', errData.error || 'عجز رصد المعاملة.');
      }
    } catch (err) {
      triggerFeedback('error', 'فشل حفظ الحركة المالية.');
    }
  };

  // API Call: Delete Transaction
  const handleDeleteTransaction = async (id: number) => {
    if (!canDo('delete_transaction')) {
      triggerFeedback('error', 'عذراً، صلاحية التراجع وحذف السندات والعمليات الحسابية محصورة بالإدارة فقط.');
      return;
    }

    if (!window.confirm("هل ترغب بالفعل في التراجع عن هذا السند وحذفه للقرائح المالية؟")) {
      return;
    }

    try {
      const res = await appFetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerFeedback('success', 'تم تصفية وحذف السند المالي المالي المحدد.');
        loadCoreData();
      } else {
        triggerFeedback('error', 'فشل حذف السند.');
      }
    } catch (err) {
      triggerFeedback('error', 'حدث خطأ أثناء إجراء الاتصال بالخادم.');
    }
  };

  // Navigation Shortcut to account statement
  const handleViewStatement = (clientId: number) => {
    setSelectedClientIdForStatement(clientId);
    setActiveTab('statements');
  };

  // Filter clients list
  const filteredClients = clients.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const clientBalance = c.balance || 0;
    if (debtFilter === 'has_debt') {
      return matchesSearch && clientBalance > 0.05;
    }
    if (debtFilter === 'settled') {
      return matchesSearch && Math.abs(clientBalance) <= 0.05;
    }
    return matchesSearch;
  });

  // 1. Connection check / Initial state
  if (dbStatus === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans text-right">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6"
        >
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
            <Database className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-base font-black tracking-tight text-slate-100">
              جاري فحص الاتصال وتأمين قواعد البيانات...
            </h2>
            <p className="text-[11px] text-slate-450 leading-relaxed max-w-xs mx-auto">
              يتم الآن التوثق التلقائي من سلامة الربط بقاعدة بيانات تطبيق مُسيّر وتأمين الدفاتر المالية وسجلات التدقيق بمقاييس الحماية.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. Broken connection state (Gatekeeper to fix connection details)
  if (!dbStatus.connected) {
    return (
      <DatabaseConnGate
        dbConfig={dbConfig}
        dbStatus={dbStatus}
        onUpdateConfig={handleUpdateDbConfig}
      />
    );
  }

  // 3. User Login Screen (when database is sound and ready)
  if (!currentUser) {
    return (
      <PinLogin
        onLoginSuccess={(user) => {
          localStorage.setItem("mosir_logged_user", JSON.stringify(user));
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-slate-900 selection:text-white bg-slate-50/50">
      {/* Dynamic Feedback Banner */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className={`fixed bottom-6 left-6 z-50 p-4 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-emerald-100/50' 
                : 'bg-red-50 text-red-800 border-red-200/80 shadow-red-100/50'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Row */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-xl border border-slate-700/60 shadow-inner flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-400 pointer-events-none" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight select-none bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                مُسيّر <span className="text-indigo-400 font-medium">|</span> نظام إدارة الديون والعملاء
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">مسجل الحسابات والذمم ذو التقارير التصديرية المعززة بالـ PDF</p>
            </div>
          </div>

          {/* Database active indicator pill and User profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-300 btn-interactive ${
                dbStatus?.connected && dbStatus.type === "mysql"
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60 shadow-lg shadow-emerald-950/20"
                  : "bg-indigo-950/40 border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/60 shadow-lg shadow-indigo-950/20"
              }`}
            >
              {dbStatus?.connected && dbStatus.type === "mysql" ? (
                <>
                  <Wifi className="w-3.5 h-3.5 animate-pulse" />
                  <span>قاعدة MySQL متصلة</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>تخزين محلي آمن</span>
                </>
              )}
            </button>

            <div className="h-9 w-px bg-slate-800" />
            <div className="flex items-center gap-2.5 bg-slate-800/40 border border-slate-800 rounded-xl px-3.5 py-1.5 text-right">
              <div>
                <p className="text-xs font-black text-white leading-tight">{currentUser.username}</p>
                <p className="text-[9px] text-indigo-400 font-extrabold uppercase leading-none mt-1">
                  {currentUser.role === "admin" ? "مدير النظام" : "موظف سداد"}
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("mosir_logged_user");
                  setCurrentUser(null);
                  setActiveTab('dashboard');
                }}
                className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                title="تسجيل الخروج من الجلسة"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Navigation Sidebar Drawer */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm space-y-1.5 sticky top-24">
            
            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedClientIdForStatement(null); }}
              className={`w-full py-3 px-4 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-3 cursor-pointer btn-interactive ${
                activeTab === "dashboard"
                  ? "sidebar-link-active"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="w-4 h-4 opacity-80" />
              لوحة التحكم والإحصاءات
            </button>

            <button
              onClick={() => { setActiveTab('clients'); setSelectedClientIdForStatement(null); }}
              className={`w-full py-3 px-4 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-3 cursor-pointer btn-interactive ${
                activeTab === "clients"
                  ? "sidebar-link-active"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4 opacity-80" />
              سجل العملاء والذمم المالية
            </button>

            <button
              onClick={() => { setActiveTab('statements'); }}
              className={`w-full py-3 px-4 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-3 cursor-pointer btn-interactive ${
                activeTab === "statements"
                  ? "sidebar-link-active"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4 opacity-80" />
              كشوفات الحسابات وتصدير PDF
            </button>

            {canDo('view_server_settings') && (
              <button
                onClick={() => { setActiveTab('settings'); setSelectedClientIdForStatement(null); }}
                className={`w-full py-3 px-4 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-3 cursor-pointer btn-interactive ${
                  activeTab === "settings"
                    ? "sidebar-link-active"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Database className="w-4 h-4 opacity-80" />
                إعدادات السيرفر والربط
              </button>
            )}

            {currentUser.role === "admin" && (
              <button
                onClick={() => { setActiveTab('users_logs'); setSelectedClientIdForStatement(null); }}
                className={`w-full py-3 px-4 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-3 cursor-pointer btn-interactive ${
                  activeTab === "users_logs"
                    ? "sidebar-link-active"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <History className="w-4 h-4 opacity-80" />
                إدارة المستخدمين والعمليات
              </button>
            )}

            <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
              <button
                onClick={() => { setEditingClient(null); setShowClientModal(true); }}
                className="w-full py-2.5 px-3.5 bg-slate-50 text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200/80 transition-colors cursor-pointer btn-interactive"
              >
                <PlusCircle className="w-4.5 h-4.5 text-slate-600" />
                إضافة عميل جديد
              </button>

              <button
                onClick={() => { setSelectedClientIdForTrans(null); setShowTransactionModal(true); }}
                className="w-full py-2.5 px-3.5 bg-slate-900 text-white hover:bg-slate-850 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer btn-interactive shadow-md shadow-slate-900/10"
              >
                <PlusCircle className="w-4.5 h-4.5 text-indigo-400" />
                قيد حركة مالية جديدة
              </button>
            </div>
          </div>
        </aside>

        {/* Dynamic Display Area */}
        <section className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-6"
              >
                
                {/* Financial Aggregate Panels */}
                {canDo('view_stats') ? (
                  <DashboardStats stats={stats} loading={loadingData} />
                ) : (
                  <div className="bg-slate-800 text-white p-5 rounded-2xl border border-slate-700/80 flex items-center justify-between gap-4 font-sans shadow-sm select-none">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
                        <h3 className="text-xs font-black">مؤشرات الأداء الكلي والصناديق مقيدة</h3>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        عذراً، تم حظر وإخفاء لقطات المجاميع التراكمية وسندات الصندوق العريضة في حسابك بقرار وقائي من مدير النظام.
                      </p>
                    </div>
                    <span className="text-[9px] bg-slate-700 text-slate-350 px-2.5 py-1 rounded-lg font-bold border border-slate-600 shrink-0">موظف سداد</span>
                  </div>
                )}

              {/* Grid block: Quick Customers Directory & Recent entries */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 2-Columns Quick Ledger */}
                <div className="lg:col-span-2 sleek-card flex flex-col">
                  <div className="px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">أرصدة العملاء الحالية</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">قائمة العملاء وأرصدة الذمم والديون المستحقة</p>
                    </div>
                    
                    {/* Tiny search wrapper with sleek input styling */}
                    <div className="relative w-full sm:w-auto">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ابحث بالاسم هنا..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-48 pr-9 pl-3.5 py-1.5 sleek-input text-xs outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Customer Rows list with ultra sleek rows */}
                  <div className="p-4 max-h-[480px] overflow-y-auto space-y-2.5">
                    {loadingData ? (
                      <p className="text-center text-xs text-slate-400 py-10 font-bold">جاري تنزيل الفهرس الحسابي للعملاء...</p>
                    ) : filteredClients.length > 0 ? (
                      filteredClients.slice(0, 7).map((c) => (
                        <div key={c.id} className="p-4 hover:bg-slate-50/50 border border-slate-100 rounded-2xl transition-all flex items-center justify-between group">
                          <div className="space-y-0.5">
                            <h5 className="font-bold text-slate-800 text-xs group-hover:text-indigo-650 transition-colors">{c.name}</h5>
                            <div className="flex gap-3 text-[10px] text-slate-400">
                              {c.phone && <span className="flex items-center gap-1 font-mono"><Phone className="w-2.5 h-2.5 opacity-70" /> {c.phone}</span>}
                              {c.email && <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5 opacity-70" /> mail</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <p className="text-[8px] text-slate-400 uppercase font-semibold">الرصيد المتبقي</p>
                              <h6 className={`text-xs font-bold font-mono tracking-tight ${0.05 < (c.balance || 0) ? "text-red-600" : "text-emerald-600"}`}>
                                {(c.balance || 0).toFixed(2)} ر.س
                              </h6>
                            </div>

                            <button
                              onClick={() => handleViewStatement(c.id)}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-900 border border-slate-200/80 rounded-xl text-[10px] font-bold text-slate-600 hover:text-white transition-all cursor-pointer btn-interactive"
                            >
                              كشف وتصدير
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-10">لم يتم العثور على أي عملاء مسجلين.</p>
                    )}

                    {clients.length > 7 && (
                      <button
                        onClick={() => setActiveTab('clients')}
                        className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 border border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        عرض جميع العملاء الـ ({clients.length}) كاملين
                      </button>
                    )}
                  </div>
                </div>

                {/* Recent Transactions entries sidebar */}
                <div className="sleek-card flex flex-col">
                  <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      آخر السندات والحركات
                    </h3>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto max-h-[480px] space-y-3">
                    {transactions.length > 0 ? (
                      transactions.slice(0, 6).map((t) => (
                        <div key={t.id} className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-150 flex items-start justify-between">
                          <div className="space-y-1.5 max-w-[70%]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold border ${
                                t.type === 'debt' ? 'badge-debt' : 'badge-payment'
                              }`}>
                                {t.type === 'debt' ? 'دين' : 'سداد'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-800 truncate max-w-[100px]">{t.clientName}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{t.description || "معاملة تجارية عامة"}</p>
                            <span className="text-[8px] text-slate-400 block font-mono font-medium">{t.date}</span>
                          </div>

                          <div className="text-left font-mono font-bold text-xs mt-0.5">
                            {t.type === 'debt' ? (
                              <span className="text-red-650">+{t.amount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                            ) : (
                              <span className="text-emerald-700">-{t.amount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-10">لا توجد عمليات مبيعات أو تحصيل مقيدة حتى الآن.</p>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* Core Customers Tab */}
          {activeTab === 'clients' && (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-6"
            >
              
              {/* Filter controls and Search board */}
              <div className="sleek-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                
                <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full md:w-auto">
                  {/* Search box */}
                  <div className="relative w-full sm:w-68">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="ابحث بالاسم أو الجوال..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 sleek-input outline-none font-medium"
                    />
                  </div>

                  {/* Status selection */}
                  <select
                    value={debtFilter}
                    onChange={(e) => setDebtFilter(e.target.value as any)}
                    className="w-full sm:w-52 px-3.5 py-2.5 sleek-input outline-none font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="all">جميع العملاء</option>
                    <option value="has_debt">عملاء مدينون (عليهم ذمم مالية)</option>
                    <option value="settled">حسابات مصفرة (خالصة الالتزام)</option>
                  </select>
                </div>

                {/* Add new Button */}
                <button
                  onClick={() => { setEditingClient(null); setShowClientModal(true); }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-slate-900/10 btn-interactive"
                >
                  <PlusCircle className="w-4.5 h-4.5 text-indigo-400" />
                  تعريف عميل جديد
                </button>
              </div>

              {/* Complete Desktop Responsive Ledger List */}
              <div className="sleek-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="sleek-table">
                    <thead>
                      <tr>
                        <th className="font-bold text-slate-700">العميل المستفيد</th>
                        <th className="font-bold text-slate-700">الجوال والاتصال</th>
                        <th className="font-bold text-red-600 text-center">المبيعات الإجمالية</th>
                        <th className="font-bold text-emerald-600 text-center">إجمالي المسدد</th>
                        <th className="font-bold text-slate-800 text-center">الحالة / الرصيد القائم</th>
                        <th className="font-bold text-slate-700 text-left">إجراءات الحساب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingData ? (
                        <tr>
                          <td colSpan={6} className="text-center font-bold text-slate-400 py-16">
                            جاري فحص وعرض ذمم العملاء...
                          </td>
                        </tr>
                      ) : filteredClients.length > 0 ? (
                        filteredClients.map((c) => {
                          const clientBalance = c.balance || 0;
                          return (
                            <tr key={c.id}>
                              {/* Client Identity details */}
                              <td>
                                <div className="space-y-1">
                                  <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                                  {c.notes && (
                                    <p className="text-[10px] text-slate-400 truncate max-w-[150px] font-medium" title={c.notes}>
                                      {c.notes}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Contacts */}
                              <td className="font-mono text-slate-600">
                                <div className="space-y-1">
                                  {c.phone ? (
                                    <span className="flex items-center gap-1 text-xs"><Phone className="w-3.5 h-3.5 text-slate-400" /> {c.phone}</span>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 italic">بدون هاتف</span>
                                  )}
                                  {c.email && (
                                    <span className="flex items-center gap-1 text-[10px] text-slate-400 lowercase"><Mail className="w-3 h-3 text-slate-450" /> mail</span>
                                  )}
                                </div>
                              </td>

                              {/* Amount Debts */}
                              <td className="text-center font-bold text-red-600 font-mono text-xs">
                                {(c.totalDebts || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} ر.س
                              </td>

                              {/* Amount Payments */}
                              <td className="text-center font-bold text-emerald-600 font-mono text-xs">
                                {(c.totalPayments || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} ر.س
                              </td>

                              {/* Net Remaining balance */}
                              <td className="text-center font-mono text-xs">
                                <div className="inline-block px-3.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl hover:shadow-xs transition-shadow">
                                  <p className={`font-bold ${clientBalance > 0.05 ? "text-red-600" : "text-emerald-700"}`}>
                                    {clientBalance.toFixed(2)} ر.س
                                  </p>
                                  <p className="text-[8px] text-slate-400 mt-0.5 font-bold">
                                    {clientBalance > 0.05 ? "مستحق السداد" : "مسير خالص"}
                                  </p>
                                </div>
                              </td>

                              {/* Operations actions */}
                              <td className="text-left">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Fast register ledger item action */}
                                  <button
                                    onClick={() => { setSelectedClientIdForTrans(c.id); setShowTransactionModal(true); }}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all btn-interactive"
                                    title="شراء بالأجل أو تسديد نقدي"
                                  >
                                    <PlusCircle className="w-4 h-4 pointer-events-none" />
                                  </button>

                                  {/* View Statement report */}
                                  <button
                                    onClick={() => handleViewStatement(c.id)}
                                    className="p-2 text-slate-700 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all btn-interactive"
                                    title="كشف مالي وتنزيل PDF"
                                  >
                                    <FileText className="w-4 h-4 pointer-events-none" />
                                  </button>

                                  {/* Edit client attributes */}
                                  <button
                                    onClick={() => { setEditingClient(c); setShowClientModal(true); }}
                                    className="p-2 text-slate-600 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all btn-interactive"
                                    title="تعديل بيانات العميل"
                                  >
                                    <Edit3 className="w-4 h-4 pointer-events-none" />
                                  </button>

                                  {/* Delete Client */}
                                  <button
                                    onClick={() => handleDeleteClient(c.id)}
                                    className="p-2 text-red-650 hover:bg-red-50 border border-red-100 rounded-xl transition-all btn-interactive"
                                    title="حذف العميل وحساباته"
                                  >
                                    <Trash2 className="w-4 h-4 pointer-events-none" />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center font-bold text-slate-450 py-12">
                            لا يوجد أي عملاء يطابقون معايير البحث والفلترة المكتوبة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* Account Statements Dashboard */}
          {activeTab === 'statements' && (
            <motion.div
              key="statements"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <AccountStatement
                clients={clients}
                transactions={transactions}
                selectedClientId={selectedClientIdForStatement}
              />
            </motion.div>
          )}

          {/* Database Parameters Config Tab */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {canDo('view_server_settings') ? (
                <DatabaseSettings
                  currentConfig={dbConfig}
                  dbStatus={dbStatus}
                  onUpdateConfig={handleUpdateDbConfig}
                  appFetch={appFetch}
                />
              ) : (
                <div className="sleek-card p-8 text-center max-w-2xl mx-auto border-amber-500/10 bg-amber-500/5 my-12 font-sans select-none">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
                  <h3 className="text-base font-black text-slate-800 mb-2">منطقة إدارية مقيدة</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    عذراً، الوصول لتبويب إعدادات خادم الربط وقاعدة البيانات مقيد بقرار وقائي لسلامة الشبكة. يرجى مراجعة مصفوفة الصلاحيات الإدارية لتمكين الوصول.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* User management and log ledger Tab */}
          {activeTab === 'users_logs' && (
            <motion.div
              key="users_logs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <UserLogSettings
                currentUser={currentUser}
              />
            </motion.div>
          )}

          </AnimatePresence>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 mt-12 text-center text-xs space-y-1">
        <p className="font-semibold text-slate-350">نظام مُسيّر للأعمال © {new Date().getFullYear()} - جميع الحقوق محفوظة.</p>
        <p className="text-[10px] text-slate-500">تم بناؤه بدقة هندسية ومزامنة متكاملة بقواعد البيانات لتأمين الدفاتر والحسابات المالية.</p>
      </footer>

      {/* CLient configuration Modal */}
      {showClientModal && (
        <ClientForm
          client={editingClient}
          onClose={() => { setShowClientModal(false); setEditingClient(null); }}
          onSave={handleSaveClient}
        />
      )}

      {/* Transaction modal registry */}
      {showTransactionModal && (
        <TransactionForm
          clients={clients}
          clientId={selectedClientIdForTrans}
          onClose={() => { setShowTransactionModal(false); setSelectedClientIdForTrans(null); }}
          onSave={handleSaveTransaction}
        />
      )}
    </div>
  );
}
