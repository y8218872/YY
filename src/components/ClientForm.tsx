import React, { useState, useEffect } from "react";
import { User, Phone, Mail, FileText, X, Save } from "lucide-react";
import { Client } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ClientFormProps {
  client?: Client | null; // If provided, we are editing
  onClose: () => void;
  onSave: (clientData: Omit<Client, "id" | "createdAt">) => Promise<void>;
}

export default function ClientForm({ client, onClose, onSave }: ClientFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (client) {
      setName(client.name);
      setPhone(client.phone || "");
      setEmail(client.email || "");
      setNotes(client.notes || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("الرجاء إدخال اسم العميل");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء حفظ بيانات العميل");
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
            {client ? "تعديل بيانات العميل الحالي" : "تعريف عميل جديد بـ المسيرّ"}
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
            <div className="p-3 bg-red-50 text-red-650 border border-red-150 rounded-xl text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {/* User Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              اسم العميل الكامل <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="أدخل الاسم الثلاثي أو اسم المؤسسة"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 sleek-input text-xs outline-none bg-slate-50/40"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              رقم الجوال
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                placeholder="مثال: 05XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 sleek-input text-xs outline-none bg-slate-50/40 text-left"
                style={{ direction: 'ltr' }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="client@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 sleek-input text-xs outline-none bg-slate-50/40 text-left"
                style={{ direction: 'ltr' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              ملاحظات أو شروط السداد
            </label>
            <div className="relative">
              <span className="absolute top-3.5 right-3.5 text-slate-400 pointer-events-none">
                <FileText className="w-4 h-4" />
              </span>
              <textarea
                placeholder="اكتب هنا أي شروط مخصصة مثل تواريخ السداد أو سقف الائتمان العيني..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 sleek-input text-xs outline-none bg-slate-50/40 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 btn-interactive cursor-pointer"
            >
              إلغاء التعديل
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-slate-900/10 transition-colors disabled:opacity-50 btn-interactive cursor-pointer"
            >
              <Save className="w-4.5 h-4.5 text-indigo-400" />
              {isSubmitting ? "جاري التثبيت..." : "حفظ بيانات العميل"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
