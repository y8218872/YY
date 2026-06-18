import React, { useState, useEffect } from "react";
import { Database, Wifi, WifiOff, ShieldCheck, KeyRound, AlertTriangle, Play, HelpCircle, HardDrive, Download, CheckCircle2 } from "lucide-react";
import { DbConfig, DbStatus } from "../types";

interface DatabaseSettingsProps {
  currentConfig: DbConfig | null;
  dbStatus: DbStatus | null;
  onUpdateConfig: (config: DbConfig) => Promise<DbStatus>;
  appFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export default function DatabaseSettings({ currentConfig, dbStatus, onUpdateConfig, appFetch }: DatabaseSettingsProps) {
  const [type, setType] = useState<'local' | 'mysql'>("local");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(3306);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [name, setName] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<DbStatus | null>(null);

  useEffect(() => {
    if (currentConfig) {
      setType(currentConfig.type);
      setHost(currentConfig.host);
      setPort(currentConfig.port);
      setUser(currentConfig.user);
      setPass(""); // Kept bulleted for safety, but we'll send it if not overwritten
      setName(currentConfig.name);
    }
  }, [currentConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const configPayload: DbConfig = {
      type,
      host: host.trim(),
      port: Number(port),
      user: user.trim(),
      pass: pass || "••••••••", // If empty, backend retains previous
      name: name.trim()
    };

    try {
      const res = await onUpdateConfig(configPayload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        connected: false,
        type: "local",
        message: "حدث خطأ غير متوقع أثناء الاتصال بقاعدة البيانات",
        error: err.message || String(err)
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDownloadBackup = async () => {
    setDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);
    try {
      const res = appFetch 
        ? await appFetch("/api/db/backup") 
        : await fetch("/api/db/backup");
      
      if (!res.ok) {
        throw new Error("فشل توليد النسخة الاحتياطية من خادم التطبيق.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeDate = new Date().toISOString().slice(0, 10);
      a.download = `mosir_backup_${safeDate}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: any) {
      setDownloadError(err.message || "حدث خطأ غير متوقع أثناء إعداد وتصدير الملف.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Status Widget */}
      <div className="sleek-card p-6">
        <h3 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500 animate-pulse" />
          حالة الاتصال النشطة بمزود البيانات لقاعدة المسيرّ
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-55 border border-slate-150 rounded-2xl gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-4 rounded-xl border ${
              dbStatus?.connected && dbStatus.type === "mysql"
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-amber-50 text-amber-600 border-amber-100"
            }`}>
              {dbStatus?.connected && dbStatus.type === "mysql" ? (
                <Wifi className="w-6 h-6 animate-pulse" />
              ) : (
                <HardDrive className="w-6 h-6 animate-pulse" />
              )}
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-sm">
                قاعدة البيانات الحالية: {dbStatus?.type === "mysql" ? "سيرفر MySQL خارجي" : "الملف المحلي الذكي (JSON Cache)"}
              </h5>
              <p className="text-xs text-slate-500 mt-1 max-w-md antialiased font-medium text-justify">
                {dbStatus?.message}
              </p>
            </div>
          </div>

          <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold leading-none ${
            dbStatus?.connected && dbStatus.type === "mysql"
              ? "bg-emerald-100 text-emerald-800 border border-emerald-250 animate-pulse"
              : "bg-blue-100 text-blue-805 border border-blue-200"
          }`}>
            {dbStatus?.type === "mysql" ? "امتداد مباشر نشط" : "تخزين دائم محلي"}
          </span>
        </div>
      </div>

      {/* Backup Card Segment */}
      <div className="sleek-card p-6 bg-gradient-to-l from-indigo-50/20 via-transparent to-transparent border-indigo-500/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-650" />
              تصدير وتنزيل نسخة احتياطية فورية (JSON Backup)
            </h4>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              قم بالحصول على نسخة احتياطية مشفرة محلياً وقابلة للقراءة لجميع دفاتر العملاء والعمليات المالية والتدقيق الرقابي ومصفوفات الصلاحيات. يوصى بمزامنة وحفظ هذه الملفات دورياً لضمان سلامة وأمان ديسك المنشأة بالكامل.
            </p>
          </div>

          <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/15 cursor-pointer transition-colors disabled:opacity-50 btn-interactive"
            >
              <Download className="w-4 h-4" />
              {downloading ? "جاري تصدير المِلَفّ..." : "تنزيل النسخة الاحتياطية (.json)"}
            </button>
            
            {downloadSuccess && (
              <span className="text-[10px] text-emerald-600 font-bold block bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تم تحميل النسخة الاحتياطية بنجاح وتسجيلها في الدفتر الرقابي!
              </span>
            )}

            {downloadError && (
              <span className="text-[10px] text-rose-500 font-bold block bg-rose-50 px-2 py-1 rounded border border-rose-100">
                {downloadError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Database Credentials Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 sleek-card p-6">
          <h4 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <KeyRound className="w-4 h-4 text-indigo-500" />
            تعديل بيانات وإعدادات قاعدة البيانات لقفل الدفاتر
          </h4>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Database Selection Switch */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">نوع الاتصال وقاعدة البيانات</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType("local")}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer btn-interactive ${
                    type === "local"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-750"
                  }`}
                >
                  تخزين محلي (بدون خواديم خارجية - أسرع وبدون انقطاع)
                </button>
                <button
                  type="button"
                  onClick={() => setType("mysql")}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer btn-interactive ${
                    type === "mysql"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-755"
                  }`}
                >
                  قاعدة بيانات MySQL الخارجية (InfinityFree أو غيرها)
                </button>
              </div>
            </div>

            {type === "mysql" && (
              <div className="space-y-4 animate-fade-in">
                {/* Host & Port Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم المضيف (Hostname / Server)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. sql311.infinityfree.com"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full px-3.5 py-2.5 sleek-input outline-none text-xs font-mono text-left"
                      style={{ direction: 'ltr' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">المنفذ (Port)</label>
                    <input
                      type="number"
                      required
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 sleek-input outline-none text-xs font-mono text-left"
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                </div>

                {/* Database Username & Database Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم المستخدم (Username)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. if0_42138261"
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                      className="w-full px-3.5 py-2.5 sleek-input outline-none text-xs font-mono text-left"
                      style={{ direction: 'ltr' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم قاعدة البيانات (Database Name)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. if0_42138261_XXX"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 sleek-input outline-none text-xs font-mono text-left"
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                </div>

                {/* Password input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">كلمة مرور السيرفر (Password)</label>
                  <input
                    type="password"
                    placeholder="•••••••• (اترك الحقل فارغاً للاحتفاظ بكلمة المرور المسجلة سابقاً)"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 sleek-input outline-none text-xs font-mono text-left"
                    style={{ direction: 'ltr' }}
                  />
                </div>
              </div>
            )}

            {/* Test Results Banner */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                testResult.connected
                  ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                  : "bg-red-50 text-red-800 border-red-100"
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${testResult.connected ? "text-emerald-600" : "text-red-500"}`} />
                  <div>
                    <p className="font-bold">{testResult.message}</p>
                    {testResult.error && (
                      <p className="mt-1 opacity-75 font-mono text-[10px] break-all">{testResult.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="submit"
                disabled={isTesting}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-slate-900/10 cursor-pointer disabled:opacity-50 btn-interactive"
              >
                <Play className="w-3.5 h-3.5 text-indigo-400 pointer-events-none" />
                {isTesting ? "جاري اختبار الاتصال..." : "حفظ واختبار الاتصال الفعلي"}
              </button>
            </div>
          </form>
        </div>

        {/* Informative Sidebar (Troubleshooting) */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            استشارة وملاحظات تقنية هامة
          </h4>

          <div className="space-y-4 text-xs text-slate-600">
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
              <h5 className="font-bold text-indigo-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                تخزين محلي آلي (Auto-Healing)
              </h5>
              <p className="leading-relaxed">
                قمنا ببناء محاكي ذكاء للاتصالات. إذا واجه التطبيق صعوبة في الاتصال المباشر بقاعدة بيانات InfinityFree، سيقوم تلقائياً بتفعيل التخزين الداخلي JSON بنسبة 100% لتجنب التوقف وحفظ كشوف حسابات عملائك من الضياع.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-750">لماذا قد يفشل الاتصال الخارجي بـ InfinityFree؟</h5>
              <p className="leading-relaxed text-justify">
                خواديم الاستضافات المجانية الشهيرة مثل <strong>InfinityFree</strong> تقوم جدار الحماية (Firewall) بحظر الاتصالات الخارجية بالكامل لـ MySQL من خارج نطاق لوحة تحكمهم لأسباب أمنية.
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <h5 className="font-bold text-slate-750">لرفع السيرفر على استضافتك لاحقاً:</h5>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>قم برفع الكود المصدري عبر ZIP.</li>
                <li>عند تشغيل السيرفر داخل استضافة PHP أو Node، قم بضبط المتغيرات الداخلية.</li>
                <li>ستقوم قاعدة البيانات MySQL ببناء الجداول تلقائياً وبكفاءة كاملة.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
