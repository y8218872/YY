import React, { useState, useEffect } from "react";
import { User, KeyRound, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PinLoginProps {
  onLoginSuccess: (user: { id: number; username: string; role: 'admin' | 'staff' }) => void;
}

interface PublicUser {
  id: number;
  username: string;
  role: 'admin' | 'staff';
}

export default function PinLogin({ onLoginSuccess }: PinLoginProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch users list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/auth/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Error fetching users list:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Soft keyboard tap handler
  const handleKeyPress = (num: string) => {
    if (submitting) return;
    setErrorMsg(null);
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (submitting) return;
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (submitting) return;
    setErrorMsg(null);
    setPin("");
  };

  // Auto submit when PIN reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && selectedUser) {
      const submitLogin = async () => {
        setSubmitting(true);
        setErrorMsg(null);
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedUser.id, pin })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            onLoginSuccess(data.user);
          } else {
            setErrorMsg(data.error || "فشل تسجيل الدخول. رمز الـ PIN غير صحيح.");
            setPin(""); // Clear code on failure
          }
        } catch (err) {
          setErrorMsg("حدث خطأ أثناء محاولة الاتصال بالخادم.");
          setPin("");
        } finally {
          setSubmitting(false);
        }
      };
      submitLogin();
    }
  }, [pin, selectedUser, onLoginSuccess]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-md bg-slate-850/70 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl p-6 md:p-8 flex flex-col items-center relative z-10 text-right">
        
        {/* System Emblem Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-500/10 mb-4 animate-pulse">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-xl font-black text-white tracking-wide">نظام المسيرّ للحسابات والديون</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">بوابة حماية الدفاتر وقيود كشف الحسابات</p>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loadingState"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center"
            >
              <div className="w-10 h-10 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-400 font-bold">جاري تأمين الاتصال بالقاعدة...</p>
            </motion.div>
          ) : !selectedUser ? (
            /* USER SELECTION VIEW */
            <motion.div
              key="selectUserView"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <h3 className="text-xs font-bold text-indigo-400 mb-4 uppercase tracking-wider text-center mr-0">
                الرجاء اختيار حساب المستخدم للمتابعة
              </h3>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    id={`user-select-btn-${u.id}`}
                    onClick={() => setSelectedUser(u)}
                    className="w-full bg-slate-800/50 border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer text-slate-350"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-750 border border-slate-700 flex items-center justify-center text-slate-350">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white mb-0.5">{u.username}</h4>
                        <span className="text-[10px] text-indigo-400 font-semibold uppercase">
                          {u.role === "admin" ? "مدير النظام" : "موظف / أمين صندوق"}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-550 rotate-180" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* PIN ENTRY VIEW */
            <motion.div
              key="enterPinView"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center"
            >
              <div className="w-full flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setPin("");
                    setErrorMsg(null);
                  }}
                  className="px-3 py-1.5 bg-slate-805 hover:bg-slate-800 text-[10px] font-bold text-slate-400 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  الرجوع للمستخدمين
                </button>
                <div className="text-right">
                  <h3 className="text-xs text-indigo-400 font-semibold">مرحباً بك</h3>
                  <h4 className="text-sm font-bold text-white">{selectedUser.username}</h4>
                </div>
              </div>

              {/* Pin dots indicator */}
              <div className="flex gap-4 my-4 justify-center">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                      i < pin.length
                        ? "bg-indigo-500 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/50"
                        : "border-slate-650 bg-slate-800"
                    }`}
                  />
                ))}
              </div>

              {/* Error messages / loading spinner */}
              <div className="h-6 flex items-center justify-center my-1.5">
                {submitting ? (
                  <div className="flex items-center gap-2 text-indigo-405 text-xs font-bold">
                    <span className="w-3 h-3 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
                    جاري التحقق من الرمز...
                  </div>
                ) : errorMsg ? (
                  <span className="text-xs font-bold text-red-405 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                    {errorMsg}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-450 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                    أدخل رمز الـ PIN المكوّن من 4 أرقام
                  </span>
                )}
              </div>

              {/* PIN Keypad Grid */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mt-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleKeyPress(num)}
                    id={`pin-key-${num}`}
                    type="button"
                    className="w-16 h-16 rounded-full bg-slate-800/60 hover:bg-slate-750 text-xl font-bold text-white border border-slate-700/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer hover:border-indigo-500/40"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Clear (C) */}
                <button
                  onClick={handleClear}
                  type="button"
                  className="w-16 h-16 rounded-full bg-slate-805 hover:bg-slate-800 text-xs font-bold text-slate-400 flex items-center justify-center transition-all cursor-pointer"
                >
                  مسح
                </button>

                {/* Number 0 */}
                <button
                  onClick={() => handleKeyPress("0")}
                  id="pin-key-0"
                  type="button"
                  className="w-16 h-16 rounded-full bg-slate-800/60 hover:bg-slate-750 text-xl font-bold text-white border border-slate-700/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer hover:border-indigo-500/40"
                >
                  0
                </button>

                {/* Backspace icon */}
                <button
                  onClick={handleDelete}
                  type="button"
                  className="w-16 h-16 rounded-full bg-slate-805 hover:bg-slate-850 text-xs font-bold text-slate-400 flex items-center justify-center transition-all cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info card containing default credentials */}
      {/*
      <div className="mt-8 max-w-sm w-full bg-indigo-500/5 backdrop-blur-xs border border-indigo-500/10 rounded-2xl p-4 flex gap-3 text-right">
        <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-slate-200 mb-1">البيانات الافتراضية للدخول السريع:</h4>
          <p className="text-[11px] leading-relaxed text-slate-400">
            • <strong className="text-indigo-305">مدير النظام</strong>: رمز الـ PIN هو{" "}
            <code className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono font-bold tracking-wider">1234</code> [صلاحية كاملة]
            <br />
            • <strong className="text-indigo-305">أمين الصندوق</strong>: رمز الـ PIN هو{" "}
            <code className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono font-bold tracking-wider">5678</code> [صلاحية تقييد فقط]
          </p>
        </div>
      </div>
      */}
    </div>
  );
}
