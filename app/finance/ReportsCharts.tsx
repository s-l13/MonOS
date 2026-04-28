"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";

export type MonthlyEntry  = { month: string; income: number; expense: number };
export type CategoryEntry = { name: string; value: number };
export type ProjectEntry  = { name: string; income: number; expense: number; investment: number };

export type ReportsData = {
  monthly:    MonthlyEntry[];
  categories: CategoryEntry[];
  projects:   ProjectEntry[];
};

const PIE_COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6"];

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" },
  labelStyle:   { color: "#F3F4F6", fontWeight: 600 },
};

function sarFormatter(value: unknown) {
  const num = value === undefined ? 0 : Number(value);
  return [`${num.toLocaleString("en-SA")} ر.س`];
}

export default function ReportsCharts({ monthly, categories, projects }: ReportsData) {
  return (
    <div className="space-y-6">

      {/* Monthly income vs expense */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-400">
          الدخل مقابل المصروفات — آخر 12 شهراً (ر.س)
        </h2>
        {monthly.every((m) => m.income === 0 && m.expense === 0) ? (
          <p className="py-8 text-center text-sm text-gray-600">لا بيانات بعد.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                axisLine={false} tickLine={false} width={64}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => {
                  const num = v === undefined ? 0 : Number(v);
                  return [
                    `${num.toLocaleString("en-SA")} ر.س`,
                    name === "income" ? "دخل" : "مصروف",
                  ];
                }}
              />
              <Legend
                formatter={(v: string) => v === "income" ? "دخل" : "مصروف"}
                wrapperStyle={{ color: "#9CA3AF", fontSize: 13, paddingTop: 12 }}
              />
              <Bar dataKey="income"  name="income"  fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Category pie chart */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-400">
          توزيع المصروفات بالفئة (ر.س)
        </h2>
        {categories.length === 0 || categories.every((c) => c.value === 0) ? (
          <p className="py-8 text-center text-sm text-gray-600">لا بيانات مصروفات بعد.</p>
        ) : (
          <div className="flex flex-col items-center md:flex-row md:justify-center md:gap-8">
            <ResponsiveContainer width={260} height={260}>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={55}
                  paddingAngle={2}
                >
                  {categories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v) => sarFormatter(v)}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-4 space-y-2 md:mt-0">
              {categories.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-gray-300">{c.name}</span>
                  <span className="mr-auto tabular-nums text-gray-400">
                    {c.value.toLocaleString("en-SA")} ر.س
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Project comparison */}
      {projects.length > 0 && (
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-400">
            مقارنة المشاريع (ر.س)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={projects} barCategoryGap="20%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                axisLine={false} tickLine={false} width={64}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => {
                  const num = v === undefined ? 0 : Number(v);
                  const labels: Record<string, string> = {
                    income: "دخل", expense: "مصروف", investment: "استثمار",
                  };
                  return [`${num.toLocaleString("en-SA")} ر.س`, labels[String(name)] ?? String(name)];
                }}
              />
              <Legend
                formatter={(v: string) => {
                  const labels: Record<string, string> = {
                    income: "دخل", expense: "مصروف", investment: "استثمار",
                  };
                  return labels[v] ?? v;
                }}
                wrapperStyle={{ color: "#9CA3AF", fontSize: 13, paddingTop: 12 }}
              />
              <Bar dataKey="income"     name="income"     fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense"    name="expense"    fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="investment" name="investment" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

    </div>
  );
}
