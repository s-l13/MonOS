import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fitnessProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { saveCalorieCalc } from "../actions";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

// Full descriptive labels shown in the profile summary card
const ACTIVITY_AR: Record<string, string> = {
  sedentary:   "مستقر — لا تمرين",
  light:       "خفيف — 1-3 أيام/أسبوع",
  moderate:    "متوسط — 3-5 أيام/أسبوع",
  active:      "نشيط — 6-7 أيام/أسبوع",
  very_active: "عالي جداً — مرتين يومياً",
};

// Short labels for inline use (TDEE note)
const ACTIVITY_SHORT: Record<string, string> = {
  sedentary:   "مستقر",
  light:       "خفيف",
  moderate:    "متوسط",
  active:      "نشيط",
  very_active: "عالي جداً",
};

const GOAL_AR: Record<string, string> = {
  weight_loss:    "تخسيس",
  weight_gain:    "زيادة الوزن",
  muscle_gain:    "بناء العضلات",
  cutting:        "تحديد",
  general_health: "صحة عامة",
  strength:       "قوة",
  endurance:      "تحمل",
};

// Map user goal → which scenario to highlight
const GOAL_TO_SCENARIO: Record<string, "maintain" | "loss" | "gain"> = {
  weight_loss:    "loss",
  cutting:        "loss",
  weight_gain:    "gain",
  muscle_gain:    "gain",
  strength:       "gain",
  general_health: "maintain",
  endurance:      "maintain",
};

// Deficit of 500 kcal/day ≈ 0.5 kg/week loss (1 lb/week — standard safe rate)
// Surplus of 300 kcal/day ≈ 0.3 kg/week gain (lean bulk)
const SCENARIOS = [
  { key: "maintain" as const, label: "للثبات في الوزن",  adj: 0,    note: "TDEE بلا تعديل" },
  { key: "loss"     as const, label: "لنزول الوزن",       adj: -500, note: "عجز 500 سعر/يوم ≈ 0.5 كغ/أسبوع" },
  { key: "gain"     as const, label: "لزيادة الوزن",      adj: +300, note: "فائض 300 سعر/يوم ≈ 0.3 كغ/أسبوع" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Mifflin-St Jeor BMR formula
// Male:   BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
// Female: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
function calcBMR(weight: number, height: number, age: number, gender: string): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}

function calcMacros(tdee: number, adj: number, weight: number) {
  const targetCals = tdee + adj;
  const protein    = weight * 2;               // 2 g/kg body weight
  const fat        = (targetCals * 0.25) / 9;  // 25% of calories from fat
  const carbs      = (targetCals - protein * 4 - fat * 9) / 4;
  return { targetCals, protein, fat, carbs };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CaloriesPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const rows = await db.select().from(fitnessProfiles).where(eq(fitnessProfiles.user_id, userId)).limit(1);
  const fp   = rows[0] ?? null;

  // ── No profile at all ───────────────────────────────────────────────────
  if (!fp) {
    return (
      <div className="min-h-screen md:flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10">
          <div className="mx-auto max-w-2xl space-y-6">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <Card>
              <div className="py-6 text-center space-y-3">
                <p className="text-lg font-semibold text-gray-200">يرجى إكمال ملفك الرياضي أولاً</p>
                <p className="text-sm text-gray-500">تحتاج إلى ملف رياضي لحساب سعراتك اليومية.</p>
                <Link
                  href="/fitness/profile"
                  className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  إنشاء الملف الرياضي ←
                </Link>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const weight   = fp.current_weight ? parseFloat(String(fp.current_weight)) : null;
  const height   = fp.height         ? parseFloat(String(fp.height))         : null;
  const age      = fp.age ?? null;
  const gender   = fp.gender ?? "male";
  const activity = fp.activity_level ?? "moderate";
  const goal     = fp.goal ?? "general_health";
  const activeKey = GOAL_TO_SCENARIO[goal] ?? "maintain";

  // ── Detect which required fields are missing ────────────────────────────
  const missingFields: string[] = [];
  if (!weight) missingFields.push("الوزن الحالي");
  if (!height) missingFields.push("الطول");
  if (!age)    missingFields.push("العمر");

  let bmr:  number | null = null;
  let tdee: number | null = null;

  if (weight && height && age) {
    bmr  = calcBMR(weight, height, age, gender);
    tdee = bmr * (ACTIVITY_MULTIPLIERS[activity] ?? 1.55);
  }

  // Pre-compute all 3 scenarios (null when profile data incomplete)
  const scenarioData = tdee && weight
    ? SCENARIOS.map((s) => ({ ...s, macros: calcMacros(tdee, s.adj, weight) }))
    : null;

  // Recommended scenario values (for the save form)
  const rec = scenarioData?.find((s) => s.key === activeKey) ?? null;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-4xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">حاسبة السعرات</h1>
          </div>

          {/* ── Profile summary ──────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400">بيانات الملف</h2>
              <Link href="/fitness/profile" className="text-xs text-blue-500 hover:text-blue-300">تعديل ←</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              {[
                ["الوزن",   weight ? `${weight} كغ` : "—"],
                ["الطول",   height ? `${height} سم` : "—"],
                ["العمر",   age    ? `${age} سنة`   : "—"],
                ["الجنس",   gender === "female" ? "أنثى" : "ذكر"],
                ["النشاط",  ACTIVITY_AR[activity] ?? activity],
                ["الهدف",   GOAL_AR[goal] ?? goal],
              ].map(([lbl, val]) => (
                <div key={lbl as string}>
                  <p className="text-xs text-gray-600">{lbl}</p>
                  <p className={`mt-0.5 font-semibold ${val === "—" ? "text-red-400" : "text-gray-200"}`}>{val}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Missing fields warning ───────────────────────────────────── */}
          {missingFields.length > 0 && (
            <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4">
              <p className="text-sm font-semibold text-amber-300 mb-1">بيانات ناقصة</p>
              <p className="text-sm text-amber-400/80">
                يرجى إضافة{" "}
                <span className="font-semibold text-amber-300">{missingFields.join(" و ")}</span>
                {" "}في{" "}
                <Link href="/fitness/profile" className="underline hover:text-amber-200">
                  الملف الرياضي
                </Link>
                {" "}لحساب السعرات.
              </p>
            </div>
          )}

          {/* ── BMR / TDEE baseline ──────────────────────────────────────── */}
          {bmr && tdee && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="text-xs text-gray-500">BMR — معدل الأيض الأساسي</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-gray-100">{Math.round(bmr)} سعر</p>
                <p className="mt-1 text-xs text-gray-700">سعرات الجسم في حالة الراحة الكاملة</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="text-xs text-gray-500">TDEE — إجمالي الحرق اليومي</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-gray-100">{Math.round(tdee)} سعر</p>
                <p className="mt-1 text-xs text-gray-700">
                  BMR × {ACTIVITY_MULTIPLIERS[activity]} ({ACTIVITY_SHORT[activity] ?? activity})
                </p>
              </div>
            </div>
          )}

          {/* ── 3 Scenarios ──────────────────────────────────────────────── */}
          {scenarioData ? (
            <>
              <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-400">
                  السعرات حسب الهدف
                  <span className="mr-2 text-xs font-normal text-gray-600">
                    — المحدد بالأزرق يطابق هدفك الحالي ({GOAL_AR[goal] ?? goal})
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {scenarioData.map((s) => {
                    const isActive = s.key === activeKey;
                    const { targetCals, protein, carbs, fat } = s.macros;
                    return (
                      <div
                        key={s.key}
                        className={`rounded-xl border-2 bg-gray-900 p-5 space-y-4 transition ${
                          isActive
                            ? "border-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]"
                            : "border-gray-800"
                        }`}
                      >
                        {/* Header */}
                        <div>
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-bold ${isActive ? "text-blue-300" : "text-gray-300"}`}>
                              {s.label}
                            </p>
                            {isActive && (
                              <span className="rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-400">
                                هدفك
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-600">{s.note}</p>
                        </div>

                        {/* Target calories */}
                        <div className="text-center py-2 rounded-lg bg-gray-800/60">
                          <p className={`text-3xl font-bold tabular-nums ${isActive ? "text-blue-400" : "text-gray-200"}`}>
                            {Math.round(targetCals)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">سعر/يوم</p>
                        </div>

                        {/* Macros */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs text-gray-600">بروتين</p>
                            <p className="mt-0.5 text-sm font-semibold text-green-400">{Math.round(protein)}غ</p>
                            <p className="text-xs text-gray-600">{Math.round(protein * 4)} سعرة</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">كارب</p>
                            <p className="mt-0.5 text-sm font-semibold text-yellow-400">{Math.round(carbs)}غ</p>
                            <p className="text-xs text-gray-600">{Math.round(carbs * 4)} سعرة</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">دهون</p>
                            <p className="mt-0.5 text-sm font-semibold text-red-400">{Math.round(fat)}غ</p>
                            <p className="text-xs text-gray-600">{Math.round(fat * 9)} سعرة</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Save recommended scenario ─────────────────────────────── */}
              {rec && (
                <Card>
                  <p className="mb-3 text-xs text-gray-500">
                    حفظ السيناريو الموصى به ({rec.label}):{" "}
                    {Math.round(rec.macros.targetCals)} سعر •{" "}
                    بروتين {Math.round(rec.macros.protein)}غ •{" "}
                    كارب {Math.round(rec.macros.carbs)}غ •{" "}
                    دهون {Math.round(rec.macros.fat)}غ
                  </p>
                  <form action={saveCalorieCalc}>
                    <input type="hidden" name="bmr"             value={String(Math.round(bmr!))} />
                    <input type="hidden" name="tdee"            value={String(Math.round(tdee!))} />
                    <input type="hidden" name="target_calories" value={String(Math.round(rec.macros.targetCals))} />
                    <input type="hidden" name="protein_g"       value={String(Math.round(rec.macros.protein))} />
                    <input type="hidden" name="carbs_g"         value={String(Math.round(rec.macros.carbs))} />
                    <input type="hidden" name="fat_g"           value={String(Math.round(rec.macros.fat))} />
                    <input type="hidden" name="goal"            value={goal} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
                    >
                      حفظ الحسابات الموصى بها
                    </button>
                  </form>
                </Card>
              )}
            </>
          ) : missingFields.length === 0 ? null : null}

          {/* ── Scientific disclaimer ─────────────────────────────────────── */}
          <p className="text-center text-xs text-gray-700">
            هذه تقديرات علمية. استشر متخصصاً للحصول على خطة دقيقة.
          </p>

        </div>
      </main>
    </div>
  );
}
