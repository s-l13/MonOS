"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type ChartEntry = {
  month: string;
  income: number;
  expense: number;
};

export default function MonthlyChart({ data }: { data: ChartEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barCategoryGap="32%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "#9CA3AF", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#F3F4F6", fontWeight: 600 }}
          formatter={(value: number, name: string) => [
            `${value.toLocaleString("en-SA")} ر.س`,
            name === "income" ? "دخل" : "مصروف",
          ]}
        />
        <Legend
          formatter={(value: string) => (value === "income" ? "دخل" : "مصروف")}
          wrapperStyle={{ color: "#9CA3AF", fontSize: 13, paddingTop: 12 }}
        />
        <Bar dataKey="income"  name="income"  fill="#10B981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
