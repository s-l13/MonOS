import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  fitnessProfiles,
  weightLogs,
  cardioLogs,
  workoutLogs,
  calorieCalculations,
} from "@/lib/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import Link from "next/link";

const GOAL_AR: Record<string, string> = {
  weight_loss:    "تخسيس",
  weight_gain:    "زيادة الوزن",
  muscle_gain:    "بناء العضلات",
  cutting:        "تحديد",
  general_health: "صحة عامة",
};

export default async function FitnessPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const now       = new Date();
  const today     = now.toISOString().slice(0, 10);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    .toISOString()
    .slice(0, 10);

  const [profile, lastWeight, lastCardio, weekWorkouts, lastCalc] = await Promise.all([
    db.select().from(fitnessProfiles).where(eq(fitnessProfiles.user_id, userId)).limit(1),
    db.select().from(weightLogs).where(eq(weightLogs.user_id, userId)).orderBy(desc(weightLogs.log_date)).limit(1),
    db.select().from(cardioLogs).where(eq(cardioLogs.user_id, userId)).orderBy(desc(cardioLogs.log_date)).limit(1),
    db.select().from(workoutLogs).where(and(eq(workoutLogs.user_id, userId), gte(workoutLogs.log_date, weekStart))),
    db.select().from(calorieCalculations).where(eq(calorieCalculations.user_id, userId)).orderBy(desc(calorieCalculations.created_at)).limit(1),
  ]);

  const fp        = profile[0] ?? null;
  const lw        = lastWeight[0] ?? null;
  const lc        = lastCardio[0] ?? null;
  const targetCal = lastCalc[0]?.target_calories ?? null;
  const goal      = fp?.goal ?? "general_health";

  const currentW = lw?.weight ?? fp?.current_weight ?? null;
  const targetW  = fp?.target_weight ?? null;
  const diff     = currentW && targetW ? (parseFloat(String(currentW)) - parseFloat(String(targetW))).toFixed(1) : null;

  const QUICK_LINKS = [
    { href: "/fitness/profile",   label: "الملف الرياضي",   desc: "عمر، وزن، هدف" },
    { href: "/fitness/calories",  label: "حاسبة السعرات",   desc: "BMR / TDEE / ماكرو" },
    { href: "/fitness/exercises", label: "مكتبة التمارين",  desc: "جميع التمارين" },
    { href: "/fitness/workouts",  label: "جدول التمارين",   desc: "خطط التدريب" },
    { href: "/fitness/progress",  label: "تتبع الوزن",      desc: "سجل الوزن" },
    { href: "/fitness/cardio",    label: "الكارديو",         desc: "سجل الكارديو" },
    { href: "/fitness/nutrition", label: "التغذية",          desc: "نصائح ومعلومات" },
    { href: "/fitness/reports",   label: "التقارير",         desc: "إحصائيات أسبوعية" },
  ];

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-5xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-300">→ الرئيسية</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-3xl font-bold text-gray-100">الصحة والرياضة</h1>
          </div>

          {fp && (
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-800 bg-blue-950 px-4 py-1.5">
              <span className="text-xs text-blue-400">الهدف:</span>
              <span className="text-sm font-semibold text-blue-200">{GOAL_AR[goal] ?? goal}</span>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="الوزن الحالي"
              value={currentW ? `${currentW} كغ` : "—"}
              sub={lw ? lw.log_date : "لم يُسجَّل"}
              color="default"
            />
            <StatCard
              label="الوزن المستهدف"
              value={targetW ? `${targetW} كغ` : "—"}
              sub={diff ? (parseFloat(diff) > 0 ? `متبقي ${Math.abs(parseFloat(diff))} كغ` : "تم الوصول! 🎉") : "غير محدد"}
              color={diff && parseFloat(diff) <= 0 ? "green" : "default"}
            />
            <StatCard
              label="السعرات المستهدفة"
              value={targetCal ? `${Math.round(parseFloat(String(targetCal)))} سعر` : "—"}
              sub="يومياً"
              color="default"
            />
            <StatCard
              label="تمارين هذا الأسبوع"
              value={String(weekWorkouts.length)}
              sub="جلسة"
              color={weekWorkouts.length >= (fp?.workout_days_per_week ?? 3) ? "green" : "default"}
            />
          </div>

          {/* Last cardio */}
          {lc && (
            <Card>
              <p className="text-xs text-gray-500 mb-1">آخر كارديو</p>
              <p className="text-sm text-gray-200">
                {lc.cardio_type} — {lc.duration_minutes} دقيقة
                {lc.calories_burned ? ` — ${lc.calories_burned} سعر محروق` : ""}
              </p>
              <p className="text-xs text-gray-600 mt-1">{lc.log_date}</p>
            </Card>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600 hover:bg-gray-800"
              >
                <p className="text-sm font-semibold text-gray-200 group-hover:text-white">{link.label}</p>
                <p className="mt-1 text-xs text-gray-500">{link.desc}</p>
              </Link>
            ))}
          </div>

          {!fp && (
            <Card>
              <p className="text-center text-sm text-gray-400">
                أنشئ ملفك الرياضي أولاً لعرض الإحصائيات المخصصة.{" "}
                <Link href="/fitness/profile" className="text-blue-400 hover:underline">إنشاء الملف</Link>
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: "green" | "default";
}) {
  const cls = { green: "text-green-400", default: "text-gray-100" };
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums leading-tight ${cls[color]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-600">{sub}</p>
    </div>
  );
}
