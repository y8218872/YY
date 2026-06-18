import { Users, Landmark, Coins, TrendingUp } from "lucide-react";
import { DashboardStats as StatsType } from "../types";

interface StatsProps {
  stats: StatsType;
  loading: boolean;
}

export default function DashboardStats({ stats, loading }: StatsProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val).replace("ر.س.‏", "").trim() + " ر.س";
  };

  const statItems = [
    {
      title: "إجمالي العملاء",
      value: stats.totalClients,
      icon: Users,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      prefix: "عميل"
    },
    {
      title: "إجمالي الديون (المستحقات)",
      value: formatCurrency(stats.totalDebts),
      icon: Landmark,
      color: "bg-red-50 text-red-600 border-red-100",
      desc: "قيمة المبيعات والخدمات الآجلة"
    },
    {
      title: "إجمالي المسدد (التحصيلات)",
      value: formatCurrency(stats.totalPayments),
      icon: Coins,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      desc: "إجمالي المقبوضات النقدية"
    },
    {
      title: "الرصيد المتبقي المطلوب سداده",
      value: formatCurrency(stats.remainingBalance),
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      desc: "صافي الدين القائم في ذمة العملاء"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="sleek-card p-6 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between gap-2.5">
              <span className="text-slate-500 font-bold text-xs select-none">{item.title}</span>
              <div className={`p-2.5 rounded-xl border ${item.color} group-hover:scale-105 transition-transform duration-300`}>
                <Icon className="w-4.5 h-4.5 pointer-events-none" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight font-mono select-none">
                {item.value} {item.prefix && <span className="text-xs font-normal text-slate-500">{item.prefix}</span>}
              </h3>
              {item.desc && (
                <p className="text-[10px] text-slate-400 mt-1 font-bold">{item.desc}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
