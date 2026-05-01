"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type WeightPoint = { date: string; weight: number };

export default function WeightChart({ data }: { data: WeightPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-gray-600">
        سجّل وزنك أكثر من مرة لعرض الرسم البياني
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "#6B7280", fontSize: 11 }}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#D1D5DB" }}
          itemStyle={{ color: "#60A5FA" }}
          formatter={(v) => [`${v} كغ`, "الوزن"]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ fill: "#3B82F6", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
