import React, { useState, useEffect, useRef } from "react";
import { Printer, Download, Calendar, ArrowUpRight, ArrowDownLeft, BookOpen, AlertCircle, FileSpreadsheet } from "lucide-react";
import { Client, Transaction } from "../types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface AccountStatementProps {
  clients: Client[];
  transactions: Transaction[];
  selectedClientId?: number | null;
}

export default function AccountStatement({ clients, transactions, selectedClientId }: AccountStatementProps) {
  const [activeClientId, setActiveClientId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedClientId) {
      setActiveClientId(selectedClientId);
    } else if (clients.length > 0 && !activeClientId) {
      setActiveClientId(clients[0].id);
    }
  }, [selectedClientId, clients]);

  // Selected client entity
  const selectedClient = clients.find((c) => c.id === Number(activeClientId));

  // Filter transactions
  const getFilteredTransactions = () => {
    if (!activeClientId) return [];

    let filtered = transactions.filter((t) => t.clientId === Number(activeClientId));

    // Sort cronologically for proper ledger calculation (oldest first)
    filtered = [...filtered].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

    // Apply date range filters
    if (startDate) {
      filtered = filtered.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((t) => t.date <= endDate);
    }

    return filtered;
  };

  const filteredTrans = getFilteredTransactions();

  // Compute aggregates for period
  const totalDebts = filteredTrans
    .filter((t) => t.type === "debt")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = filteredTrans
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const periodNetChange = totalDebts - totalPayments;

  // Compute balance before this period (opening balance)
  const getOpeningBalance = () => {
    if (!activeClientId || !startDate) return 0;
    
    // Sum of all transactions before startDate
    const priorTrans = transactions.filter(
      (t) => t.clientId === Number(activeClientId) && t.date < startDate
    );
    const priorDebts = priorTrans.filter((t) => t.type === "debt").reduce((sum, t) => sum + t.amount, 0);
    const priorPayments = priorTrans.filter((t) => t.type === "payment").reduce((sum, t) => sum + t.amount, 0);
    
    return priorDebts - priorPayments;
  };

  const openingBalance = getOpeningBalance();
  const closingBalance = openingBalance + periodNetChange;

  // Build ledger list with progressive cumulative balance
  const buildLedgerItems = () => {
    let currentBalance = openingBalance;
    return filteredTrans.map((t) => {
      if (t.type === "debt") {
        currentBalance += t.amount;
      } else {
        currentBalance -= t.amount;
      }
      return {
        ...t,
        cumulativeBalance: currentBalance
      };
    });
  };

  const ledgerItems = buildLedgerItems();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val) + " ر.س";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // Export Account Statement to PDF
  const handleExportPDF = async () => {
    if (!printRef.current || !selectedClient) return;

    setIsExporting(true);
    try {
      const element = printRef.current;
      
      // Use html2canvas to render the element exactly as styled
      const canvas = await html2canvas(element, {
        scale: 2, // Double quality for resolution sharpness
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const width = imgWidth * ratio;
      const height = imgHeight * ratio;
      
      // Padding margins
      const xOffset = (pdfWidth - width) / 2;
      const yOffset = 5;

      pdf.addImage(imgData, "PNG", xOffset, yOffset, width, height, "", "FAST");
      
      // Save file with client name and date
      const dateName = new Date().toISOString().split('T')[0];
      pdf.save(`كشف_حساب_${selectedClient.name.replace(/\s+/g, "_")}_${dateName}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="sleek-card p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          توليد كشف الحساب والتقارير الموثوقة لـ العملاء
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Client Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">اختر العميل المستهدف</label>
            <select
              value={activeClientId}
              onChange={(e) => setActiveClientId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3.5 py-2.5 sleek-input outline-none text-xs font-bold transition-all text-slate-700 cursor-pointer"
            >
              <option value="">-- اضغط للاختيار من العملاء --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">من تاريخ (بداية الفترة)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 pointer-events-none">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 sleek-input outline-none text-xs text-center font-bold text-slate-700"
              />
            </div>
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">إلى تاريخ (نهاية الفترة)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 pointer-events-none">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 sleek-input outline-none text-xs text-center font-bold text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Actions bar */}
        {selectedClient && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
            <p className="text-[11px] text-slate-450 font-medium">
              * يمكنك فلترة كشف الحساب بـتحديد تواريخ مفرزة، ثم إصدار وطباعة نسخة PDF رسمية.
            </p>
            <div className="flex gap-2">
              {/* Trigger Direct Web Print Print */}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-55 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer btn-interactive"
              >
                <Printer className="w-4 h-4 text-indigo-500" />
                طباعة سريعة
              </button>

              {/* PDF generator with loading status */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-850 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-slate-900/10 cursor-pointer disabled:opacity-50 btn-interactive"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                {isExporting ? "جاري توليد الـ PDF..." : "تحميل كشف حساب PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Statement Canvas */}
      {selectedClient ? (
        <div className="bg-slate-50 p-1 md:p-6 rounded-3xl border border-slate-200/50 shadow-xs">
          {/* Printable container */}
          <div
            id="statement-print-area"
            ref={printRef}
            className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm text-slate-800 w-full"
            style={{ direction: "rtl" }}
          >
            {/* Report Header Logo Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-850 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-1">
                  <span className="w-4 h-4 bg-slate-800 inline-block rounded-xs"></span>
                  كشف حساب مالي تفصيلي
                </h1>
                <p className="text-sm text-slate-500">نظام إدارة الديون والتحصيلات الذكي - كفاءة عالية</p>
              </div>
              <div className="text-right sm:text-left mt-4 sm:mt-0 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-750">تاريخ إصدار التقرير: {formatDate(new Date().toISOString().split('T')[0])}</p>
                <p>توقيت الطباعة: {new Date().toLocaleTimeString('ar-SA')}</p>
                <p className="text-[10px] text-slate-400">مرجع مشفر: ACC-STATEMENT-{selectedClient.id}</p>
              </div>
            </div>

            {/* Client Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-xl border border-slate-150 mb-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">بيانات العميل المستعلم</h4>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-850">{selectedClient.name}</p>
                  {selectedClient.phone && <p className="text-sm text-slate-600">الجوال: <span className="font-mono">{selectedClient.phone}</span></p>}
                  {selectedClient.email && <p className="text-sm text-slate-600">البريد الإلكتروني: {selectedClient.email}</p>}
                </div>
              </div>

              <div className="text-right flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">الفترة الزمنية للاستعلام</h4>
                  <p className="text-sm text-slate-700">
                    {startDate ? `من: ${formatDate(startDate)}` : "من: بداية المعاملات الأولى"}
                  </p>
                  <p className="text-sm text-slate-700">
                    {endDate ? `إلى: ${formatDate(endDate)}` : `إلى: اليوم (${formatDate(new Date().toISOString().split('T')[0])})`}
                  </p>
                </div>
                {selectedClient.notes && (
                  <p className="text-xs italic text-slate-400 mt-2 truncate max-w-xs" title={selectedClient.notes}>
                    * ملاحظات: {selectedClient.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Period Balance Ledger Aggregates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 text-center">
                <p className="text-xs text-slate-500 font-semibold mb-1">الرصيد السابق الافتتاحي</p>
                <h5 className="text-base font-bold text-slate-800">{formatCurrency(openingBalance)}</h5>
              </div>
              <div className="p-4 bg-red-50/65 rounded-xl border border-red-100 text-center">
                <p className="text-xs text-red-500 font-semibold mb-1">إجمالي المبيعات (ديون الفترة)</p>
                <h5 className="text-base font-bold text-red-700">+{formatCurrency(totalDebts)}</h5>
              </div>
              <div className="p-4 bg-emerald-50/65 rounded-xl border border-emerald-100 text-center">
                <p className="text-xs text-emerald-500 font-semibold mb-1">إجمالي المسدد (متحصلات الفترة)</p>
                <h5 className="text-base font-bold text-emerald-700">-{formatCurrency(totalPayments)}</h5>
              </div>
              <div className="p-4 bg-slate-900 text-white rounded-xl text-center">
                <p className="text-xs text-slate-300 mb-1">صافي الرصيد الختامي القائم</p>
                <h5 className="text-base font-black">{formatCurrency(closingBalance)}</h5>
              </div>
            </div>

            {/* Chronological Table of Entries */}
            {ledgerItems.length > 0 ? (
              <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-xs text-right sleek-table">
                  <thead>
                    <tr className="border-b border-slate-150">
                      <th className="px-4 py-3 font-bold text-slate-700">تاريخ القيد</th>
                      <th className="px-4 py-3 font-bold text-slate-700">النوع</th>
                      <th className="px-4 py-3 font-bold text-slate-700">البيان / تفصيل العملية</th>
                      <th className="px-4 py-3 font-bold text-red-650 text-center">مدين (+)</th>
                      <th className="px-4 py-3 font-bold text-emerald-650 text-center">دائن (-)</th>
                      <th className="px-4 py-3 font-bold text-slate-700 text-left">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Prior opening balance row if applicable */}
                    {startDate && (
                      <tr className="border-b border-slate-100 bg-slate-50/30">
                        <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{formatDate(startDate)}</td>
                        <td className="px-4 py-3.5 text-xs font-bold text-slate-500">رصيد افتتاحي</td>
                        <td className="px-4 py-3.5 text-xs text-slate-400 italic">رصيد ما قبل تاريخ بداية الفلترة المحدد</td>
                        <td className="px-4 py-3.5 text-center text-slate-400 font-serif">-</td>
                        <td className="px-4 py-3.5 text-center text-slate-400 font-serif">-</td>
                        <td className="px-4 py-3.5 text-left font-bold text-slate-600 truncate font-mono">{formatCurrency(openingBalance)}</td>
                      </tr>
                    )}

                    {ledgerItems.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/15"
                        }`}
                      >
                        <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">
                          {item.date}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              item.type === "debt"
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}
                          >
                            {item.type === "debt" ? "دين / فاتورة" : "سداد دفعة"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs font-medium max-w-[200px] truncate" title={item.description}>
                          {item.description || "معاملة تجارية عامة"}
                        </td>
                        <td className="px-4 py-3.5 text-center text-red-600 font-semibold font-mono text-xs">
                          {item.type === "debt" ? `+${item.amount.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-3.5 text-center text-emerald-600 font-semibold font-mono text-xs">
                          {item.type === "payment" ? `-${item.amount.toFixed(2)}` : "-"}
                        </td>
                        <td className={`px-4 py-3.5 text-left font-bold font-mono text-xs ${
                          item.cumulativeBalance > 0 ? "text-red-650" : item.cumulativeBalance < 0 ? "text-emerald-650" : "text-slate-600"
                        }`}>
                          {formatCurrency(item.cumulativeBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-150 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <h6 className="text-sm font-bold text-slate-700">لا يوجد أي ديون أو مدفوعات مسجلة لمطابقة معايير الفلترة المحددة.</h6>
                <p className="text-xs text-slate-400">يرجى تعديل تواريخ البحث أو إضافة قيود جديدة للعميل.</p>
              </div>
            )}

            {/* Official Stamps / Signature Guidelines */}
            <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-dashed border-slate-350 text-slate-500">
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-450 mb-8">توقيع المستخرد/المحاسب المسؤول</p>
                <div className="w-36 h-[1px] bg-slate-300 mx-auto"></div>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-450 mb-8">مصادقة وتوقيع صاحب الصلاحية</p>
                <div className="w-36 h-[1px] bg-slate-300 mx-auto"></div>
              </div>
            </div>

            {/* Report Footer Note */}
            <p className="text-[10px] text-center text-slate-400 mt-12 mb-2">
              إن هذا التقرير يمثل كشف حساب مالي رسمي للعمل المتبادل لشركتنا مع العميل المذكور. يرجى المراجعة والاعتراض في ظرف 7 أيام من تاريخه.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700 mb-1">الرجاء اختيار العميل من القائمة</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            اختر عميلاً من الشريط العلوي لاستعراض دفتر الأستاذ التفصيلي الخاص به وتوليد كشوفات الديون وسداد المقبوضات النقدية بدقة.
          </p>
        </div>
      )}
    </div>
  );
}
