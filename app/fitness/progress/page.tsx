import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { weightLogs, fitnessProfiles } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { addWeightLog, deleteWeightLog } from "../actions";
import Link from "next/link";
import WeightChart from "./WeightChart";
import type { WeightPoint } from "./WeightChart";

export default async function ProgressPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const today = new Date().toISOString().slice(0, 10);

  const [logs, profileRows] = await Promise.all([
    db.select().from(weightLogs).where(eq(weightLogs.user_id, userId)).orderBy(desc(weightLogs.log_date)).limit(20),
    db.select().from(fitnessProfiles).where(eq(fitnessProfiles.user_id, userId)).limit(1),
  ]);

  const fp       = profileRows[0] ?? null;
  const targetW  = fp?.target_weight ? parseFloat(String(fp.target_weight)) : null;
  const latest   = logs[0] ? parseFloat(String(logs[0].weight)) : null;
  const diff     = latest && targetW ? (latest - targetW).toFixed(1) : null;

  const chartData: WeightPoint[] = [...logs]
    .reverse()
    .map((l) => ({ date: l.log_date, weight: parseFloat(String(l.weight)) }));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">تتبع الوزن</h1>
          </div>

          {/* Target diff */}
          {diff !== null && (
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${
              parseFloat(diff) <= 0
                ? "border-green-800 bg-green-950 text-green-300"
                : "border-yellow-800 bg-yellow-950 text-yellow-300"
            }`}>
              {parseFloat(diff) <= 0
                ? `تم الوصول للهدف! الوزن الحالي: ${latest} كغ`
                : `متبقي ${Math.abs(parseFloat(diff))} كغ للوصول للهدف (${targetW} كغ)`}
            </div>
          )}

          {/* Add weight log */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">تسجيل وزن جديد</h2>
            <form action={addWeightLog} className="flex flex-wrap gap-3">
              <input
                name="weight"
                type="number"
                step="0.1"
                required
                placeholder="الوزن (كغ)"
                className="flex-1 min-w-32 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
              />
              <input
                name="log_date"
                type="date"
                defaultValue={today}
                required
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:outline-none"
              />
              <input
                name="notes"
                placeholder="ملاحظات (اختياري)"
                className="flex-1 min-w-40 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                إضافة
              </button>
            </form>
          </Card>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-gray-400">مسار الوزن</h2>
              <WeightChart data={chartData} />
            </Card>
          )}

          {/* Weight log table */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">آخر 20 تسجيل</h2>
            {logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-600">لا سجلات بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500">
                      <th className="pb-2 font-normal">التاريخ</th>
                      <th className="pb-2 font-normal">الوزن</th>
                      <th className="pb-2 font-normal">ملاحظات</th>
                      <th className="pb-2 font-normal"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => {
                      const prev = logs[i + 1];
                      const delta = prev ? (parseFloat(String(log.weight)) - parseFloat(String(prev.weight))).toFixed(1) : null;
                      return (
                        <tr key={log.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                          <td className="py-2.5 text-xs text-gray-500">{log.log_date}</td>
                          <td className="py-2.5 font-semibold text-gray-100 tabular-nums">
                            {log.weight} كغ
                            {delta !== null && (
                              <span className={`mr-2 text-xs ${parseFloat(delta) < 0 ? "text-green-400" : parseFloat(delta) > 0 ? "text-red-400" : "text-gray-600"}`}>
                                {parseFloat(delta) > 0 ? `+${delta}` : delta}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-xs text-gray-500">{log.notes ?? "—"}</td>
                          <td className="py-2.5">
                            <form action={deleteWeightLog}>
                              <input type="hidden" name="id" value={log.id} />
                              <button
                                type="submit"
                                className="text-xs text-red-600 hover:text-red-400"
                              >
                                حذف
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </div>
      </main>
    </div>
  );
}
