import React, { useState, useEffect } from "react";
import { User, AuditLog } from "../types";
import { 
  Users, 
  History, 
  Trash2, 
  UserPlus, 
  KeyRound, 
  ShieldAlert,
  Calendar,
  Lock,
  Activity,
  CheckCircle2,
  Trash,
  Settings,
  Scale,
  Shield,
  Sliders,
  Check,
  CheckSquare,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UserLogSettingsProps {
  currentUser: { id: number; username: string; role: 'admin' | 'staff' };
}

interface RolePermissions {
  add_payment: boolean;
  add_debt: boolean;
  add_client: boolean;
  edit_client: boolean;
  delete_client: boolean;
  delete_transaction: boolean;
  view_stats: boolean;
  view_server_settings: boolean;
}

export default function UserLogSettings({ currentUser }: UserLogSettingsProps) {
  // Navigation Sub-tabs inside User log settings
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'permissions' | 'logs'>('users');
  
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions>({
    add_payment: true,
    add_debt: true,
    add_client: true,
    edit_client: false,
    delete_client: false,
    delete_transaction: false,
    view_stats: true,
    view_server_settings: false
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [savingPermissions, setSavingPermissions] = useState<boolean>(false);
  
  // Create User state form
  const [username, setUsername] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [role, setRole] = useState<'admin' | 'staff'>("staff");
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch core users, logs, and permissions from API
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const headers = {
        "x-user-id": currentUser.id.toString(),
        "x-username": encodeURIComponent(currentUser.username)
      };

      const [usersRes, logsRes, permRes] = await Promise.all([
        fetch("/api/users", { headers }),
        fetch("/api/logs", { headers }),
        fetch("/api/roles/permissions", { headers })
      ]);

      if (usersRes.ok && logsRes.ok) {
        const usersData = await usersRes.json();
        const logsData = await logsRes.json();
        setUsersList(usersData);
        setAuditLogs(logsData);
      }
      
      if (permRes.ok) {
        const permData = await permRes.json();
        setPermissions(permData);
      }
    } catch (err) {
      console.error("Failed to load user management context", err);
      setErrorMsg("حدث تعذر أثناء استيراد قوائم المستخدمين والسجلات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const triggerToast = (type: 'success' | 'role_error' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(text);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Create User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== "admin") {
      triggerToast('role_error', "غير مسموح للموظفين بإجراء العمليات الإدارية.");
      return;
    }

    if (!username.trim()) {
      triggerToast('error', "يرجى تعبئة اسم المستخدم أولاً.");
      return;
    }

    if (!pin.trim() || pin.trim().length !== 4 || isNaN(Number(pin))) {
      triggerToast('error', "رمز الـ PIN يجب أن يكون من 4 أرقام دقيقة وحصرية.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id.toString(),
          "x-username": encodeURIComponent(currentUser.username)
        },
        body: JSON.stringify({
          username: username.trim(),
          pin: pin.trim(),
          role
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast('success', "تم تأسيس حساب المستخدم الجديد وتقييده بالسجل الفعلي بنجاح!");
        setUsername("");
        setPin("");
        setRole("staff");
        loadData();
      } else {
        triggerToast('error', data.error || "عجز النظام عن حفظ العضو الجديد.");
      }
    } catch (err) {
      triggerToast('error', "فشل الاتصال بالخادم لتعريف المستخدم.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User after modal confirmation
  const handleDeleteUser = async (targetId: number) => {
    if (currentUser.role !== "admin") {
      triggerToast('role_error', "عذراً، يتطلب هذا الإجراء صلاحية مدير النظام.");
      return;
    }

    if (targetId === currentUser.id) {
      triggerToast('error', "لا يمكنك إلغاء أو حذف حسابك الشخصي النشط حالياً.");
      return;
    }

    try {
      const res = await fetch(`/api/users/${targetId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": currentUser.id.toString(),
          "x-username": encodeURIComponent(currentUser.username)
        }
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast('success', "تم حذف وإبعاد المستخدم من الدفاتر الأمنية.");
        setUserToDelete(null);
        loadData();
      } else {
        triggerToast('error', data.error || "حدث خطأ غير متوقع أثناء الحذف.");
      }
    } catch (err) {
      triggerToast('error', "تعذر الاتصال بالخادم الخلفي لإتمام المعالجة.");
    }
  };

  // Save modified role permissions toggles
  const handleSavePermissions = async (customPerms: RolePermissions) => {
    if (currentUser.role !== "admin") {
      triggerToast('role_error', "هذا الإجراء يتطلب صلاحيات مدير النظام.");
      return;
    }

    setSavingPermissions(true);
    try {
      const res = await fetch("/api/roles/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id.toString(),
          "x-username": encodeURIComponent(currentUser.username)
        },
        body: JSON.stringify({ permissions: customPerms })
      });

      const data = await res.json();
      if (res.ok) {
        setPermissions(data.permissions);
        triggerToast('success', "تم تبويب وحفظ تعديل مصفوفة صلاحيات طاقم العمل وتعميمها بنجاح.");
        // Reload settings to refresh logs
        const logsRes = await fetch("/api/logs", {
          headers: {
            "x-user-id": currentUser.id.toString(),
            "x-username": encodeURIComponent(currentUser.username)
          }
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setAuditLogs(logsData);
        }
      } else {
        triggerToast('error', data.error || "فشل حفظ جدول الصلاحيات.");
      }
    } catch (err) {
      triggerToast('error', "خطأ أثناء محاولة الاتصال بالخادم لحفظ الصلاحيات.");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleTogglePermission = (key: keyof RolePermissions) => {
    const updatedPerms = {
      ...permissions,
      [key]: !permissions[key]
    };
    setPermissions(updatedPerms);
    // Auto save on toggle
    handleSavePermissions(updatedPerms);
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  // Staff restriction guard interface
  if (currentUser.role !== "admin") {
    return (
      <div className="space-y-6">
        <div className="sleek-card p-8 text-center max-w-2xl mx-auto border-amber-500/10 bg-amber-500/5 my-12">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-base font-black text-slate-800 mb-2">منطقة إدارية مقيدة ومحفوظة</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            عذراً، إن لوحة التحكم بالمستخدمين وسجلات التدقيق الرقابي مخصصة حصرياً لـ <strong className="text-indigo-600">مدير النظام (Admin)</strong>. بصفتك موظف سداد ("أمين صندوق") لا يمكنك الاطلاع على إعدادات الأمان أو التعديل في الدفاتير الأمنية الحساسة.
          </p>
          <div className="pt-4 border-t border-slate-100 flex justify-center gap-4 text-[11px] text-slate-400">
            <span>المستخدم الحالي: <strong>{currentUser.username}</strong></span>
            <span>•</span>
            <span>الصلاحية الحالية: <strong>موظف سداد</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // Define translation labels for permissions map
  const permissionsMetaList: { key: keyof RolePermissions; label: string; desc: string; category: string }[] = [
    {
      key: "add_client",
      label: "تعريف العملاء وتسجيل دفاتر السجلات",
      desc: "السماح بإضافة عملاء جدد وإدخال أسمائهم وأرقام هواتفهم في الدفتر.",
      category: "إدارة العملاء"
    },
    {
      key: "edit_client",
      label: "تعديل وتصحيح بيانات العملاء",
      desc: "السماح بتعديل أرقام الهواتف وأسماء العملاء للتصحيح.",
      category: "إدارة العملاء"
    },
    {
      key: "delete_client",
      label: "شطب وحذف حسابات العملاء نهائياً",
      desc: "إجراء حساس يسمح بإزالة ملف العميل وكافة ديونه من قاعدة البيانات بشكل كلي.",
      category: "إدارة العملاء"
    },
    {
      key: "add_debt",
      label: "قيد دَين جديد في ذمة العميل",
      desc: "تسجيل المشتريات بالآجل والمستحقات المترتبة على العميل.",
      category: "الحركات المالية والسندات"
    },
    {
      key: "add_payment",
      label: "استلام دفعات سداد من العملاء وتنزيلها",
      desc: "السماح بقيد المبالغ المدفوعة نقدياً لتخفيض رصيد العميل في كشف الحساب.",
      category: "الحركات المالية والسندات"
    },
    {
      key: "delete_transaction",
      label: "إلغاء وحذف الحركات المالية أو السندات",
      desc: "حذف أو تعديل أي قيد مالي تم تسجيله سابقاً (خطير، يتطلب حذراً كبيراً).",
      category: "الحركات المالية والسندات"
    },
    {
      key: "view_stats",
      label: "استكشاف لوحة الحساب الأرباح والتقارير العامة",
      desc: "السماح بمراجعة قيم الذمم المترصدة، ومجموع الديون المستحقة، والمقاييس المالية العامة.",
      category: "التقارير والإحصاء"
    },
    {
      key: "view_server_settings",
      label: "عرض وتعديل إعدادات السيرفر والربط",
      desc: "السماح بالوصول لتبويب إعدادات السيرفر وقاعدة البيانات وتنزيل النسخ الاحتياطية وتعديل الربط.",
      category: "التحكم في النظام والربط"
    }
  ];

  return (
    <div className="space-y-8 select-none">
      {/* Dynamic feedback banner */}
      {(successMsg || errorMsg) && (
        <div className="fixed bottom-6 left-6 z-50 animate-bounce">
          {successMsg && (
            <div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold font-sans">
              <CheckCircle2 className="w-4 h-4" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-rose-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold font-sans">
              <ShieldAlert className="w-4 h-4" />
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Primary Sub-Tabs Controller for the section */}
      <div className="flex border-b border-slate-200 gap-4 mb-4 pb-0.5">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 px-1 transition-all cursor-pointer ${
            activeSubTab === 'users'
              ? "border-indigo-600 text-indigo-750"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          إدارة المستخدمين والموظفين
        </button>

        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 px-1 transition-all cursor-pointer ${
            activeSubTab === 'permissions'
              ? "border-indigo-600 text-indigo-750"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders className="w-4 h-4" />
          تبويب وصلاحيات الموظفين (أمين الصندوق)
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 px-1 transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? "border-indigo-600 text-indigo-750"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          سجل الرقابة والتدقيق الشامل
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* SUBTAB 1: USERS */}
        {activeSubTab === 'users' && (
          <motion.div
            key="usersTab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Form to Create User */}
            <div className="lg:col-span-1 sleek-card p-6 flex flex-col justify-between bg-white">
              <div>
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserPlus className="w-5 h-5 text-indigo-500" />
                  إضافة مستخدم جديد للنظام
                </h3>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم الموظف أو المستخدم</label>
                    <input
                      type="text"
                      placeholder="مثال: صالح الدوسري"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 sleek-input text-xs font-bold text-slate-850"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">رمز المرور المباشر PIN (فقط 4 أرقام)</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-3.5 py-2.5 sleek-input text-center text-sm font-mono tracking-widest text-slate-850"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1.5 leading-normal">
                      * يُمكّن رمز الـ PIN المكوّن من 4 أرقام الموظف من تسجيل الدخول السريع عبر شاشة لوحة المفتاح.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">مستوى الصلاحيات الفعال</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'admin' | 'staff')}
                      className="w-full px-3.5 py-2.5 sleek-input cursor-pointer text-xs font-bold text-slate-750 bg-white"
                    >
                      <option value="staff">أمين صندوق / موظف سداد (خاضع لجدول الصلاحيات)</option>
                      <option value="admin">مدير نظام (صلاحيات كاملة وغير خاضع للقيود)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-705 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-indigo-600/10 disabled:opacity-50 btn-interactive"
                  >
                    <UserPlus className="w-4 h-4" />
                    {submitting ? "جاري التقييد بالخادم..." : "تسجيل وتعديل الحسابات"}
                  </button>
                </form>
              </div>
            </div>

            {/* Users list database representation */}
            <div className="lg:col-span-2 sleek-card p-6 bg-white">
              <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  المستخدمين والموظفين النشطين بالمنشأة
                </span>
                <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                  {usersList.length} مستخدمين
                </span>
              </h3>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-10">
                    <div className="w-8 h-8 border-3 border-slate-150 border-t-indigo-550 rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-slate-400 font-bold">جاري تحميل سجل الأمان...</span>
                  </div>
                ) : usersList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">لا يوجد أي مستخدمين معرّفين مسبقاً.</p>
                ) : (
                  <table className="w-full text-xs text-right sleek-table">
                    <thead>
                      <tr className="border-b border-slate-105 text-slate-500 bg-slate-50/50">
                        <th className="px-4 py-3 font-extrabold">اسم المستخدم</th>
                        <th className="px-4 py-3 font-extrabold">الصلاحية</th>
                        <th className="px-4 py-3 font-extrabold text-center">رمز الـ PIN</th>
                        <th className="px-4 py-3 font-extrabold text-left">تاريخ التأسيس</th>
                        <th className="px-4 py-3 text-left">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-850 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-650 text-[10px] font-black uppercase">
                              {u.username.substring(0, 2)}
                            </div>
                            {u.username}
                            {u.id === currentUser.id && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-850 px-2 py-0.5 rounded-full font-bold">
                                أنت حالياً
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              u.role === "admin" 
                                ? "bg-purple-100 text-purple-850 border border-purple-200" 
                                : "bg-indigo-50 text-indigo-750 border border-indigo-100"
                            }`}>
                              {u.role === "admin" ? "مدير نظام" : "أمين صندوق"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono font-bold tracking-widest text-slate-600">
                            {u.pin}
                          </td>
                          <td className="px-4 py-3.5 text-left font-mono text-[11px] text-slate-400">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar-SA") : "لا يوجد"}
                          </td>
                          <td className="px-4 py-3.5 text-left">
                            <button
                              onClick={() => setUserToDelete(u)}
                              disabled={u.id === currentUser.id}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                              title="حذف الموظف"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 2: GROUP PERMISSIONS */}
        {activeSubTab === 'permissions' && (
          <motion.div
            key="permissionsTab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sleek-card p-6 bg-white"
          >
            {/* Header / Info box */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-650" />
                  مصفوفة التحكم في صلاحيات موظفي المبيعات والتحصيل
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  قم بتمكين أو تعطيل الميزات الفردية المخصصة لطاقم "أمين صندوق" (Staff). يتم تطبيق وحفظ الإعدادات لمجرد الضغط التبادلي والتحديث وتدوينها أمنياً.
                </p>
              </div>
              <div className="text-left">
                {savingPermissions ? (
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border-2 border-slate-400 border-t-indigo-650 rounded-full animate-spin" />
                    جاري تعميم القيم وحفظها...
                  </span>
                ) : (
                  <span className="text-xs text-emerald-750 bg-emerald-50 px-3.5 py-1.5 rounded-xl font-bold border border-emerald-100">
                    تم التأمين والمزامنة تلقائياً
                  </span>
                )}
              </div>
            </div>

            {/* Categorized Permissions checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permissionsMetaList.map((meta) => {
                const isChecked = permissions[meta.key];
                return (
                  <div
                    key={meta.key}
                    onClick={() => handleTogglePermission(meta.key)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-start gap-4 hover:shadow-sm ${
                      isChecked
                        ? "bg-indigo-50/40 border-indigo-200"
                        : "bg-slate-50/50 border-slate-200/80 grayscale opacity-80"
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase bg-slate-250/20 text-slate-500 px-2 py-0.5 rounded">
                        {meta.category}
                      </span>
                      <h4 className="text-xs font-black text-slate-850 mt-1.5">{meta.label}</h4>
                      <p className="text-[11px] text-slate-500 leading-normal font-sans pt-0.5">
                        {meta.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
                        isChecked
                          ? "bg-indigo-600 border-indigo-650 text-white shadow-md shadow-indigo-600/10"
                          : "bg-white border-slate-250 text-slate-350"
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-5 h-5 stroke-[3px]" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-350" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Security Warning notice */}
            <div className="mt-8 bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 flex gap-3 text-right">
              <ShieldAlert className="w-5 h-5 text-amber-550 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-850 mb-1">تنبيه حماية هائل:</h4>
                <p className="text-[11px] leading-relaxed text-amber-900/80">
                  يرجى الانتباه إلى أن تمكين صلاحيات مثل <strong>شطب العميل</strong> أو <strong>حذف حركات الصناديق والسندات</strong> قد تفتح احتمالية لحدوث تلاعب مالي أو شطب ديون فعلية دون استرجاعها. يوصى دوماً لـ "أمين الصندوق" بالاكتفاء بـ تسجيل الحركات والسداد فقط.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 3: LOGS */}
        {activeSubTab === 'logs' && (
          <motion.div
            key="logsTab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sleek-card p-6 bg-white"
          >
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 justify-between">
              <span className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500 animate-pulse" />
                سجل التدقيق الرقابي ولقطات الجلسات النشطة لـ المراجعة
              </span>
              <span className="text-[11px] bg-slate-100 text-slate-650 px-2.5 py-1 rounded-full font-mono font-bold">
                آخر {auditLogs.length} عملية مأرشفة
              </span>
            </h3>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-400 font-bold">جاري تحميل حركات السجل الشامل...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Activity className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                <p className="text-xs text-slate-400">لا توجد عمليات مسجلة محلياً أو خارجياً في هذا الربع بعد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[440px] overflow-y-auto pr-1">
                <table className="w-full text-xs text-right sleek-table">
                  <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5 font-black text-slate-700 bg-slate-50/50">تاريخ ووقت الحدث</th>
                      <th className="px-4 py-3.5 font-black text-slate-700 bg-slate-50/50">القائم بالعملية</th>
                      <th className="px-4 py-3.5 font-black text-slate-700 bg-slate-50/50">الحدث الأساسي</th>
                      <th className="px-4 py-3.5 font-black text-slate-700 bg-slate-50/50">التفاصيل والتأمين والمزامنة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100/50 hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-450">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            {log.username}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action.includes("حذف") 
                              ? "bg-rose-50 text-rose-750 border border-rose-100" 
                              : log.action.includes("دخول")
                              ? "bg-emerald-50 text-emerald-750 border border-emerald-100"
                              : "bg-indigo-50 text-indigo-750 border border-indigo-100"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-bold whitespace-pre-line max-w-sm leading-relaxed">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans" id="delete-user-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-xl relative text-right"
              id="delete-user-modal-content"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-650 mb-6 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              
              <h3 className="text-base font-black text-slate-850 mb-2 text-center">
                تأكيد عزل وإقصاء الحساب
              </h3>
              
              <p className="text-xs text-slate-500 leading-relaxed text-center mb-6">
                هل أنت متأكد تماماً من رغبتك في حذف حساب الموظف <span className="font-bold text-slate-800">«{userToDelete.username}»</span>؟
                هذا الإجراء سيؤدي لتعطيل صلاحياته وحظر دخوله للوحة النظام بالكامل وبشكل نهائي.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDeleteUser(userToDelete.id)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10 btn-interactive"
                  id="btn-confirm-delete-user"
                >
                  <Trash2 className="w-4 h-4" />
                  نعم، تأكيد الحذف
                </button>
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center btn-interactive"
                  id="btn-cancel-delete-user"
                >
                  تراجع وإلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
