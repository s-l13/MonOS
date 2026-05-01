import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workoutLogs, cardioLogs, weightLogs, fitnessProfiles } from "@/lib/schema";
import { eq, gte, desc } from "drizzle-orm";
import Link from "next/link";

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const now       = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [
    weekWorkouts,
    weekCardio,
    weekWeights,
    monthWorkouts,
    monthCardio,
    profileRows,
    lastWeights,
  ] = await Promise.all([
    db.select().from(workoutLogs).where(eq(workoutLogs.user_id, userId)).then((r) => r.filter((l) => l.log_date >= weekStart)),
    db.select().from(cardioLogs).where(eq(cardioLogs.user_id, userId)).then((r) => r.filter((l) => l.log_date >= weekStart)),
    db.select().from(weightLogs).where(eq(weightLogs.user_id, userId)).then((r) => r.filter((l) => l.log_date >= weekStart)),
    db.select().from(workoutLogs).where(eq(workoutLogs.user_id, userId)).then((r) => r.filter((l) => l.log_date >= monthStart)),
    db.select().from(cardioLogs).where(eq(cardioLogs.user_id, userId)).then((r) => r.filter((l) => l.log_date >= monthStart)),
    db.select().from(fitnessProfiles).where(eq(fitnessProfiles.user_id, userId)).limit(1),
    db.select().from(weightLogs).where(eq(weightLogs.user_id, userId)).orderBy(desc(weightLogs.log_date)).limit(5),
  ]);

  const fp = profileRows[0] ?? null;
  const target = fp?.workout_days_per_week ?? 3;

  const weekCardioMinutes  = weekCardio.reduce((s, l) => s + l.duration_minutes, 0);
  const weekCaloriesBurned = weekCardio.reduce((s, l) => s + (l.calories_burned ?? 0), 0);
  const monthCardioMinutes = monthCardio.reduce((s, l) => s + l.duration_minutes, 0);

  const avgWeight = weekWeights.length
    ? (weekWeights.reduce((s, l) => s + parseFloat(String(l.weight)), 0) / weekWeights.length).toFixed(1)
    : null;

  const adherence = target > 0 ? Math.min(100, Math.round((weekWorkouts.length / target) * 100)) : 0;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-4xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">التقارير</h1>
          </div>

          {/* Weekly stats */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">هذا الأسبوع</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="جلسات التمرين" value={String(weekWorkouts.length)} sub={`الهدف: ${target}`} color={weekWorkouts.length >= target ? "green" : "default"} />
              <StatCard label="جلسات الكارديو" value={String(weekCardio.length)} sub={`${weekCardioMinutes} دقيقة`} color="default" />
              <StatCard label="متوسط الوزن" value={avgWeight ? `${avgWeight} كغ` : "—"} sub="هذا الأسبوع" color="default" />
              <StatCard label="الالتزام" value={`${adherence}%`} sub="بخطة التمرين" color={adherence >= 80 ? "green" : adherence >= 50 ? "yellow" : "red"} />
            </div>
          </div>

          {/* Monthly stats */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">هذا الشهر</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard label="إجمالي التمارين" value={String(monthWorkouts.length)} sub="جلسة" color="default" />
              <StatCard label="إجمالي الكارديو" value={String(monthCardio.length)} sub={`${monthCardioMinutes} دقيقة`} color="default" />
              <StatCard label="السعرات المحروقة" value={String(weekCaloriesBurned || "—")} sub="هذا الأسبوع" color="default" />
            </div>
          </div>

          {/* Weight trend */}
          {lastWeights.length > 0 && (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-gray-400">آخر 5 قراءات وزن</h2>
              <div className="flex items-end gap-4">
                {lastWeights.map((w, i) => {
                  const prev = lastWeights[i + 1];
                  const delta = prev ? parseFloat(String(w.weight)) - parseFloat(String(prev.weight)) : 0;
                  return (
                    <div key={w.id} className="flex-1 text-center">
                      <div className="mb-1">
                        {delta < 0 ? (
                          <span className="text-xs text-green-400">▼ {Math.abs(delta).toFixed(1)}</span>
                        ) : delta > 0 ? (
                          <span className="text-xs text-red-400">▲ {delta.toFixed(1)}</span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </div>
                      <div className="rounded-lg bg-gray-800 py-2">
                        <p className="text-sm font-bold text-gray-100">{w.weight}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{w.log_date.slice(5)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: "green" | "yellow" | "red" | "default";
}) {
  const cls = {
    green:   "text-green-400",
    yellow:  "text-yellow-400",
    red:     "text-red-400",
    default: "text-gray-100",
  };
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${cls[color]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-600">{sub}</p>
    </div>
  );
}
