import React, { useState, useEffect } from "react";
import { DollarSign, Calendar, FileText, ArrowUpRight, ArrowDownLeft, X, Save } from "lucide-react";
import { Client, TransactionType } from "../types";
import { motion } from "motion/react";

interface TransactionFormProps {
  clients: Client[];
  clientId?: number | null; // If selected, lock the selection
  onClose: () => void;
  onSave: (transData: {
    clientId: number;
    type: TransactionType;
    amount: number;
    date: string;
    description: string;
  }) => Promise<void>;
}

export default function TransactionForm({ clients, clientId, onClose, onSave }: TransactionFormProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | "">("");
  const [type, setType] = useState<TransactionType>("debt");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Default to today's date
    const today = new Date().toISOString().split('T')[0];
    setDate(today);

    if (clientId) {
      setSelectedClientId(clientId);
    } else if (clients.length > 0) {
      setSelectedClientId("");
    }
  }, [clientId, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedClientId) {
      setErrorMessage("الرجاء اختيار العميل من القائمة");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("المبلغ يجب أن يكون رقماً صحيحاً أكبر من الصفر");
      return;
    }

    if (!date) {
      setErrorMessage("الرجاء تحديد تاريخ العملية");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        clientId: Number(selectedClientId),
        type,
        amount: numAmount,
        date,
        description: description.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء رصد المعاملة المالية");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200/50 flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-50/50 px-6 py-4.5 border-b border-slate-150 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            {type === "debt" ? "تسجيل مبيعات جديدة بالأجل (دين)" : "تسجيل دفعة نقدية مستلمة (تحصيل)"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-705 p-1.5 rounded-xl hover:bg-slate-100/85 transition-colors cursor-pointer btn-interactive"
          >
            <X className="w-4.5 h-4.5 pointer-events-none" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-650 border border-red-155 rounded-xl text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {/* Type Selection (Tabs) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">
              نوع الحركة المالية المسجلة
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("debt")}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer btn-interactive ${
                  type === "debt"
                    ? "border-red-500 bg-red-50/60 text-red-700 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50 text-slate-500"
                }`}
              >
                <ArrowUpRight className="w-4.5 h-4.5 text-red-500 pointer-events-none" />
                تسجيل شراء بالأجل (دين)
              </button>

              <button
                type="button"
                onClick={() => setType("payment")}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer btn-interactive ${
                  type === "payment"
                    ? "border-emerald-500 bg-emerald-50/60 text-emerald-700 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50 text-slate-500"
                }`}
              >
                <ArrowDownLeft className="w-4.5 h-4.5 text-emerald-500 pointer-events-none" />
                قيد سداد وحساب (دفعة)
              </button>
            </div>
          </div>

          {/* Client Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              اختيار العميل المعني من الدليل <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={clientId !== undefined && clientId !== null}
              className="w-full px-3.5 py-2.5 sleek-input outline-none text-xs text-slate-705 font-bold cursor-pointer disabled:opacity-75 disabled:bg-slate-50"
            >
              <option value="">-- اختر من قائمة العملاء المسجلين --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date Field Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                المبلغ الحسابي المقيد (ر.س) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none">
                  <DollarSign className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 sleek-input text-xs font-bold outline-none text-left"
                  style={{ direction: 'ltr' }}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                تاريخ وتوقيت الحركة <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 sleek-input text-xs outline-none text-center font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              بيان الحركة التفصيلي (الوصف)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none">
                <FileText className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="مثال: شراء تجهيزات / دفع جزء من الحساب القائم"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 sleek-input text-xs outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all disabled:opacity-50 btn-interactive cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 btn-interactive cursor-pointer ${
                type === "debt"
                  ? "bg-red-700 shadow-red-900/50 hover:bg-red-700 shadow-red-900/10"
                  : "bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/10"
              }`}
            >
              <Save className="w-4.5 h-4.5" />
              {isSubmitting ? "جاري الحفظ..." : type === "debt" ? "تثبيت قيد الدين" : "تسجيل معاملة السداد"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
