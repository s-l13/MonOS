import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workoutLogs, cardioLogs, weightLogs, fitnessProfiles } from "@/lib/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = "daily" | "weekly" | "monthly";

type Props = {
  searchParams: Promise<{ period?: string }>;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReportsPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) return null;

  const { period: rawPeriod = "weekly" } = await searchParams;
  const period: Period = (["daily", "weekly", "monthly"] as string[]).includes(rawPeriod)
    ? (rawPeriod as Period)
    : "weekly";

  const now      = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStartStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    .toISOString().slice(0, 10);
  const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10);
  const ninetyAgoStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
    .toISOString().slice(0, 10);

  // Fetch last 90 days for streak + period filtering
  const [allWorkouts, allCardio, allWeights, profileRows] = await Promise.all([
    db.select().from(workoutLogs)
      .where(and(eq(workoutLogs.user_id, userId), gte(workoutLogs.log_date, ninetyAgoStr))),
    db.select().from(cardioLogs)
      .where(and(eq(cardioLogs.user_id, userId), gte(cardioLogs.log_date, ninetyAgoStr))),
    db.select().from(weightLogs)
      .where(and(eq(weightLogs.user_id, userId), gte(weightLogs.log_date, ninetyAgoStr)))
      .orderBy(desc(weightLogs.log_date)),
    db.select().from(fitnessProfiles).where(eq(fitnessProfiles.user_id, userId)).limit(1),
  ]);

  const fp     = profileRows[0] ?? null;
  const target = fp?.workout_days_per_week ?? 3;

  // ── Streak ──────────────────────────────────────────────────────────────
  const activeDates = new Set([
    ...allWorkouts.map((l) => l.log_date),
    ...allCardio.map((l) => l.log_date),
    ...allWeights.map((l) => l.log_date),
  ]);

  let streak = 0;
  const cursor = new Date(now);
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // ── Weekly adherence (always, for motivational message) ─────────────────
  const weekWorkouts = allWorkouts.filter((l) => l.log_date >= weekStartStr);
  const adherence    = target > 0 ? Math.min(100, Math.round((weekWorkouts.length / target) * 100)) : 0;

  const motivation =
    adherence >= 80
      ? { text: "ممتاز! أنت على المسار الصحيح", emoji: "💪", color: "text-green-400", bg: "bg-green-950/50 border-green-800" }
      : adherence >= 50
      ? { text: "جيد! يمكنك تحسين الالتزام",    emoji: "👍", color: "text-yellow-400", bg: "bg-yellow-950/50 border-yellow-800" }
      : { text: "لا تستسلم! كل يوم جديد فرصة",  emoji: "🌟", color: "text-blue-300",   bg: "bg-blue-950/50 border-blue-800" };

  // ── Period filter ────────────────────────────────────────────────────────
  const rangeStart = period === "daily" ? todayStr : period === "weekly" ? weekStartStr : monthStartStr;

  const periodWorkouts = allWorkouts.filter((l) => l.log_date >= rangeStart);
  const periodCardio   = allCardio.filter((l) => l.log_date >= rangeStart);
  const periodWeights  = allWeights.filter((l) => l.log_date >= rangeStart);

  const cardioMinutes  = periodCardio.reduce((s, l) => s + l.duration_minutes, 0);
  const caloriesBurned = periodCardio.reduce((s, l) => s + (l.calories_burned ?? 0), 0);

  const avgWeight = periodWeights.length
    ? (periodWeights.reduce((s, l) => s + parseFloat(String(l.weight)), 0) / periodWeights.length).toFixed(1)
    : null;

  const lastWeights = allWeights.slice(0, 5);

  const periodLabel =
    period === "daily" ? "اليوم" : period === "weekly" ? "هذا الأسبوع" : "هذا الشهر";

  // For monthly period show month adherence
  const monthDays     = now.getDate(); // days elapsed so far
  const targetMonthly = Math.round(target * (monthDays / 7));
  const periodAdherence =
    period === "monthly" && targetMonthly > 0
      ? Math.min(100, Math.round((periodWorkouts.length / targetMonthly) * 100))
      : adherence;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">التقارير</h1>
          </div>

          {/* Streak + Motivational message */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Streak */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-950 text-2xl">
                🔥
              </div>
              <div>
                <p className="text-xs text-gray-500">سلسلة الالتزام</p>
                <p className="text-2xl font-bold tabular-nums text-orange-400">{streak} يوم</p>
                <p className="text-xs text-gray-600">متتالي</p>
              </div>
            </div>

            {/* Motivational */}
            <div className={`rounded-xl border p-4 flex items-center gap-4 ${motivation.bg}`}>
              <span className="text-2xl shrink-0">{motivation.emoji}</span>
              <div>
                <p className={`font-semibold ${motivation.color}`}>{motivation.text}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  الالتزام الأسبوعي: {adherence}% ({weekWorkouts.length}/{target} جلسات)
                </p>
              </div>
            </div>
          </div>

          {/* Period tabs */}
          <div className="flex gap-2 rounded-xl border border-gray-800 bg-gray-900 p-1 w-fit">
            {([
              { key: "daily",   label: "اليوم" },
              { key: "weekly",  label: "هذا الأسبوع" },
              { key: "monthly", label: "هذا الشهر" },
            ] as { key: Period; label: string }[]).map(({ key, label }) => (
              <Link
                key={key}
                href={`/fitness/reports?period=${key}`}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  period === key
                    ? "bg-blue-700 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Period stats */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">{periodLabel}</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="جلسات التمرين"
                value={String(periodWorkouts.length)}
                sub={period === "daily" ? "اليوم" : `الهدف: ${period === "monthly" ? targetMonthly : target}`}
                color={periodWorkouts.length >= (period === "monthly" ? targetMonthly : target) && periodWorkouts.length > 0 ? "green" : "default"}
              />
              <StatCard
                label="جلسات الكارديو"
                value={String(periodCardio.length)}
                sub={cardioMinutes > 0 ? `${cardioMinutes} دقيقة` : "لا توجد"}
                color="default"
              />
              <StatCard
                label="متوسط الوزن"
                value={avgWeight ? `${avgWeight} كغ` : "—"}
                sub={periodWeights.length > 0 ? `${periodWeights.length} قراءة` : "لا توجد قراءات"}
                color="default"
              />
              <StatCard
                label="الالتزام"
                value={`${period === "monthly" ? periodAdherence : adherence}%`}
                sub="بخطة التمرين"
                color={periodAdherence >= 80 ? "green" : periodAdherence >= 50 ? "yellow" : "red"}
              />
            </div>
          </div>

          {/* Cardio details */}
          {caloriesBurned > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="text-xs text-gray-500">إجمالي وقت الكارديو</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-gray-100">{cardioMinutes} دقيقة</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="text-xs text-gray-500">السعرات المحروقة</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-red-400">{caloriesBurned} سعر</p>
              </div>
            </div>
          )}

          {/* Weight trend */}
          {lastWeights.length > 0 && (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-gray-400">آخر 5 قراءات وزن</h2>
              <div className="flex items-end gap-3">
                {lastWeights.map((w, i) => {
                  const prev  = lastWeights[i + 1];
                  const delta = prev ? parseFloat(String(w.weight)) - parseFloat(String(prev.weight)) : 0;
                  return (
                    <div key={w.id} className="flex-1 text-center">
                      <div className="mb-1 h-4">
                        {delta < 0 ? (
                          <span className="text-xs text-green-400">▼ {Math.abs(delta).toFixed(1)}</span>
                        ) : delta > 0 ? (
                          <span className="text-xs text-red-400">▲ {delta.toFixed(1)}</span>
                        ) : null}
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

          {/* Empty state */}
          {periodWorkouts.length === 0 && periodCardio.length === 0 && periodWeights.length === 0 && (
            <Card>
              <p className="py-4 text-center text-sm text-gray-500">
                لا توجد بيانات لـ{periodLabel}. ابدأ بتسجيل{" "}
                <Link href="/fitness/workouts" className="text-blue-400 hover:underline">تمرين</Link>{" "}
                أو{" "}
                <Link href="/fitness/cardio" className="text-blue-400 hover:underline">كارديو</Link>.
              </p>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, color }: {
  label: string;
  value: string;
  sub: string;
  color: "green" | "yellow" | "red" | "default";
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
