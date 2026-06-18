import React, { useState, useEffect } from "react";
import { 
  Database, 
  WifiOff, 
  KeyRound, 
  AlertTriangle, 
  CheckCircle,
  HardDrive
} from "lucide-react";
import { DbConfig, DbStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface DatabaseConnGateProps {
  dbConfig: DbConfig | null;
  dbStatus: DbStatus;
  onUpdateConfig: (config: DbConfig) => Promise<DbStatus>;
}

export default function DatabaseConnGate({ dbConfig, dbStatus, onUpdateConfig }: DatabaseConnGateProps) {
  const [type, setType] = useState<'local' | 'mysql'>("mysql");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(3306);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<DbStatus | null>(null);

  useEffect(() => {
    if (dbConfig) {
      setType(dbConfig.type);
      setHost(dbConfig.host || "");
      setPort(dbConfig.port || 3306);
      setUser(dbConfig.user || "");
      setPass(""); // do not prefill actual password for security, back-end keeps previous if empty
      setName(dbConfig.name || "");
    }
  }, [dbConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const configPayload: DbConfig = {
      type,
      host: host.trim(),
      port: Number(port),
      user: user.trim(),
      pass: pass || "••••••••", // backend handles replacing with existing password if unchanged
      name: name.trim()
    };

    try {
      const res = await onUpdateConfig(configPayload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        connected: false,
        type: "local",
        message: "حدث خطأ أثناء محاولة الاتصال بقاعدة البيانات",
        error: err.message || String(err)
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSwitchToLocal = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const localPayload: DbConfig = {
        type: "local",
        host: "",
        port: 3306,
        user: "",
        pass: "",
        name: ""
      };
      const res = await onUpdateConfig(localPayload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        connected: false,
        type: "local",
        message: "فشل التحول بنجاح لوضع التخزين المحلي الاحتياطي الكفؤ.",
        error: err.message || String(err)
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 text-white font-sans text-right selection:bg-indigo-500">
      <div className="max-w-2xl w-full bg-slate-850 border border-slate-750/70 shadow-2xl rounded-3xl overflow-hidden relative">
        
        {/* Warning Header Panel */}
        <div className="p-6 bg-gradient-to-r from-amber-600/20 to-rose-600/10 border-b border-slate-750/50 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20 shadow-inner">
            <WifiOff className="w-8 h-8 animate-bounce" />
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-base font-black text-slate-100">
              خطأ في ربط ومطابقة قاعدة البيانات الفعالة
            </h1>
            <p className="text-xs text-slate-350 leading-relaxed">
              تعذّر على سيرفر مُسيّر الاتصال بسيرفر MySQL المحدد، أو أن بيانات الدخول غير صحيحة حالياً.
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Current Error Details Log */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>تفاصيل المشكلة والتشخيص الرقابي:</span>
            </div>
            <p className="leading-relaxed text-[11px] text-justify text-slate-350 font-medium">
              {dbStatus?.message || "رابط الاتصال لم يُرجع أي استجابة آمنة من الخادم الخارجي."}
            </p>
            {dbStatus?.error && (
              <div className="mt-2 pt-2 border-t border-slate-800/80">
                <code className="text-[10px] text-red-300 font-mono block break-all text-left">
                  {dbStatus.error}
                </code>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Database Selection Tabs inside Gateway */}
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2.5">
                تعديل خيار استضافة قاعدة البيانات لقفل الدفاتر
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setType("mysql")}
                  className={`py-3 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    type === "mysql"
                      ? "bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/50"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Database className="w-4 h-4" />
                  سيرفر MySQL خارجي
                </button>
                <button
                  type="button"
                  onClick={() => setType("local")}
                  className={`py-3 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    type === "local"
                      ? "bg-slate-800 text-amber-400 shadow-sm border border-slate-700/50"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  تخزين محلي (Cache JSON)
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {type === "mysql" ? (
                <motion.div
                  key="mysql-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Hostname & Port Form field row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">
                        اسم المضيف (Host IP / Domain)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. vlgqb6.h.filess.io"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 text-white rounded-xl focus:border-indigo-500 focus:outline-none text-xs font-mono text-left"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">
                        المنفذ (Port)
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="3306"
                        value={port}
                        onChange={(e) => setPort(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 text-white rounded-xl focus:border-indigo-500 focus:outline-none text-xs font-mono text-left"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                  </div>

                  {/* Username & Database name row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">
                        اسم المستخدم (User)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. yza_foundcanal"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 text-white rounded-xl focus:border-indigo-500 focus:outline-none text-xs font-mono text-left"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">
                        اسم قاعدة البيانات (Database)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. yza_foundcanal"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 text-white rounded-xl focus:border-indigo-500 focus:outline-none text-xs font-mono text-left"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                  </div>

                  {/* Password row */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">
                      كلمة مرور السيرفر (Password)
                    </label>
                    <input
                      type="password"
                      placeholder="•••••••• (اترك الحفل فارغاً للاحتفظ بكلمة المرور المسجلة سابقاً)"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-750 text-white rounded-xl focus:border-indigo-500 focus:outline-none text-xs font-mono text-left"
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="local-info"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2 text-justify"
                >
                  <p className="text-xs text-amber-300 leading-relaxed font-bold">
                    📌 نظام التخزين المحلي الآمن والمسرّع:
                  </p>
                  <p className="text-[11px] text-slate-350 leading-relaxed">
                    باختيارك التخزين المحلي، سيتم قفل وحفظ جميع الحسابات والمعاملات والدفاتر الأمنية المالية مباشرة داخل مخدم التطبيق المستقر (الملف المحلي المشفر data/db.json). لا يتطلب هذا الخيار أي إعدادات خارجية أو مزود MySQL مستقل، مما يضمن عمل التطبيق بنسبة 100% بكفاءة استثنائية وسرعة فورية دون انقطاع.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Test Connection Results Alert */}
            {testResult && (
              <div className={`p-4 rounded-2xl text-xs flex gap-3 ${
                testResult.connected 
                  ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-900/30 border border-rose-500/30 text-rose-300'
              }`}>
                {testResult.connected ? (
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                )}
                <div>
                  <h6 className="font-bold">{testResult.connected ? "نجاح أمن الربط!" : "فشل الربط والتحقق!"}</h6>
                  <p className="text-[11px] mt-1 leading-relaxed text-justify">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Action Buttons inside gate */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {type === "mysql" ? (
                <>
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="w-full sm:flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 disabled:opacity-50 btn-interactive"
                  >
                    <KeyRound className="w-4 h-4" />
                    {isTesting ? "جاري فحص الاتصال واختبار السيرفر..." : "تطبيق ومطابقة بيانات الاتصال"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToLocal}
                    disabled={isTesting}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer text-center disabled:opacity-50 border border-slate-700/50 btn-interactive"
                  >
                    التحول السريع للتخزين المحلي
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleSwitchToLocal}
                  disabled={isTesting}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-600/15 disabled:opacity-50 btn-interactive"
                >
                  <HardDrive className="w-4 h-4" />
                  {isTesting ? "جاري التفعيل الآمن للتخزين ومزامنة الذاكرة المحلية..." : "التحول فوراً للتخزين المحلي وتأكيد الدخول"}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Brand identity footer */}
        <div className="py-4 bg-slate-900 border-t border-slate-800 text-center text-[10px] text-slate-500">
          نظام مُسيّر للأعمال • بوابة فحص الاتصال وقفل الدفاتر المالية المشفرة
        </div>
      </div>
    </div>
  );
}
