import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fitnessProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { saveCalorieCalc } from "../actions";
import Link from "next/link";

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<string, number> = {
  weight_loss:    -400,
  weight_gain:    +300,
  muscle_gain:    +200,
  cutting:        -300,
  general_health: 0,
};

const GOAL_AR: Record<string, string> = {
  weight_loss:    "تخسيس",
  weight_gain:    "زيادة الوزن",
  muscle_gain:    "بناء العضلات",
  cutting:        "تحديد",
  general_health: "صحة عامة",
};

const ACTIVITY_AR: Record<string, string> = {
  sedentary:   "خامل",
  light:       "خفيف",
  moderate:    "معتدل",
  active:      "نشيط",
  very_active: "خارق النشاط",
};

export default async function CaloriesPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const rows = await db.select().from(fitnessProfiles).where(eq(fitnessProfiles.user_id, userId)).limit(1);
  const fp = rows[0] ?? null;

  if (!fp) {
    return (
      <div className="min-h-screen md:flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10">
          <div className="mx-auto max-w-2xl space-y-6">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <Card>
              <p className="text-center text-sm text-gray-400 py-6">
                يجب إنشاء{" "}
                <Link href="/fitness/profile" className="text-blue-400 hover:underline">الملف الرياضي</Link>{" "}
                أولاً لحساب السعرات.
              </p>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const weight  = fp.current_weight ? parseFloat(String(fp.current_weight)) : null;
  const height  = fp.height ? parseFloat(String(fp.height)) : null;
  const age     = fp.age ?? null;
  const gender  = fp.gender ?? "male";
  const activity = fp.activity_level ?? "moderate";
  const goal    = fp.goal ?? "general_health";

  let bmr: number | null = null;
  let tdee: number | null = null;
  let targetCals: number | null = null;
  let protein: number | null = null;
  let fat: number | null = null;
  let carbs: number | null = null;

  if (weight && height && age) {
    bmr = gender === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

    const multiplier = ACTIVITY_MULTIPLIERS[activity] ?? 1.55;
    tdee = bmr * multiplier;

    const adjustment = GOAL_ADJUSTMENTS[goal] ?? 0;
    targetCals = tdee + adjustment;

    protein = weight * 2;
    fat = (targetCals * 0.25) / 9;
    carbs = (targetCals - protein * 4 - fat * 9) / 4;
  }

  const round = (n: number | null) => (n ? Math.round(n) : "—");

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">حاسبة السعرات</h1>
          </div>

          {/* Profile summary */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">بيانات الملف</h2>
            <div className="grid grid-cols-3 gap-4 text-sm md:grid-cols-6">
              {[
                ["الوزن", weight ? `${weight} كغ` : "—"],
                ["الطول", height ? `${height} سم` : "—"],
                ["العمر", age ? `${age} سنة` : "—"],
                ["الجنس", gender === "female" ? "أنثى" : "ذكر"],
                ["النشاط", ACTIVITY_AR[activity] ?? activity],
                ["الهدف", GOAL_AR[goal] ?? goal],
              ].map(([lbl, val]) => (
                <div key={lbl} className="text-center">
                  <p className="text-xs text-gray-600">{lbl}</p>
                  <p className="mt-1 font-semibold text-gray-200">{val}</p>
                </div>
              ))}
            </div>
          </Card>

          {bmr ? (
            <>
              {/* Main calorie cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <CalCard label="BMR (معدل الأيض الأساسي)" value={`${round(bmr)} سعر`} color="default" />
                <CalCard label="TDEE (إجمالي الحرق اليومي)" value={`${round(tdee)} سعر`} color="default" />
                <CalCard label="السعرات المستهدفة" value={`${round(targetCals)} سعر`} color="blue" />
              </div>

              {/* Macro cards */}
              <div className="grid grid-cols-3 gap-3">
                <CalCard label="بروتين" value={`${round(protein)} غرام`} color="green" />
                <CalCard label="كارب" value={`${round(carbs)} غرام`} color="yellow" />
                <CalCard label="دهون" value={`${round(fat)} غرام`} color="red" />
              </div>

              {/* Save button */}
              <Card>
                <form action={saveCalorieCalc}>
                  <input type="hidden" name="bmr" value={String(bmr)} />
                  <input type="hidden" name="tdee" value={String(tdee)} />
                  <input type="hidden" name="target_calories" value={String(targetCals)} />
                  <input type="hidden" name="protein_g" value={String(protein)} />
                  <input type="hidden" name="carbs_g" value={String(carbs)} />
                  <input type="hidden" name="fat_g" value={String(fat)} />
                  <input type="hidden" name="goal" value={goal} />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
                  >
                    حفظ الحسابات
                  </button>
                </form>
              </Card>
            </>
          ) : (
            <Card>
              <p className="text-center text-sm text-gray-500 py-4">
                أكمل بيانات الوزن والطول والعمر في{" "}
                <Link href="/fitness/profile" className="text-blue-400 hover:underline">الملف الرياضي</Link>{" "}
                لحساب السعرات.
              </p>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}

function CalCard({ label, value, color }: {
  label: string; value: string;
  color: "default" | "blue" | "green" | "yellow" | "red";
}) {
  const cls = {
    default: "text-gray-100",
    blue:    "text-blue-400",
    green:   "text-green-400",
    yellow:  "text-yellow-400",
    red:     "text-red-400",
  };
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${cls[color]}`}>{value}</p>
    </div>
  );
}
