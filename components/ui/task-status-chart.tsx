"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type StatusCounts = {
  new: number;
  in_progress: number;
  completed: number;
  late: number;
  postponed: number;
};

type Props = {
  counts: StatusCounts;
};

const SLICES = [
  { key: "new",         label: "جديدة",         color: "#0ea5e9" }, // sky-500
  { key: "in_progress", label: "قيد التنفيذ",   color: "#3b82f6" }, // blue-500
  { key: "completed",   label: "مكتملة",         color: "#22c55e" }, // green-500
  { key: "late",        label: "متأخرة",          color: "#ef4444" }, // red-500
  { key: "postponed",   label: "مؤجلة",           color: "#6b7280" }, // gray-500
];

export default function TaskStatusChart({ counts }: Props) {
  const data = SLICES.map((s) => ({
    name: s.label,
    value: counts[s.key as keyof StatusCounts],
    color: s.color,
  })).filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        لا توجد مهام بعد
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            const num = value === undefined ? 0 : Number(value);
            return [`${num} (${Math.round((num / total) * 100)}%)`, ""];
          }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#111827",
            fontSize: "13px",
            direction: "rtl",
            color: "#e5e7eb",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
