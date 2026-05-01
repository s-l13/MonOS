import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fitnessProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import CaloriesClient from "./CaloriesClient";

// ---------------------------------------------------------------------------
// Constants (server-only)
// ---------------------------------------------------------------------------

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

const ACTIVITY_AR: Record<string, string> = {
  sedentary:   "مستقر — لا تمرين",
  light:       "خفيف — 1-3 أيام/أسبوع",
  moderate:    "متوسط — 3-5 أيام/أسبوع",
  active:      "نشيط — 6-7 أيام/أسبوع",
  very_active: "عالي جداً — مرتين يومياً",
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

// Mifflin-St Jeor BMR
// Male:   BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
// Female: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
function calcBMR(weight: number, height: number, age: number, gender: string): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
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

  // ── Detect missing required fields ─────────────────────────────────────
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

  const activityMultiplier = ACTIVITY_MULTIPLIERS[activity] ?? 1.55;

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
              {([
                ["الوزن",  weight ? `${weight} كغ` : "—"],
                ["الطول",  height ? `${height} سم` : "—"],
                ["العمر",  age    ? `${age} سنة`   : "—"],
                ["الجنس",  gender === "female" ? "أنثى" : "ذكر"],
                ["النشاط", ACTIVITY_AR[activity] ?? activity],
                ["الهدف",  GOAL_AR[goal] ?? goal],
              ] as [string, string][]).map(([lbl, val]) => (
                <div key={lbl}>
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

          {/* ── Interactive calculator (client) ─────────────────────────── */}
          {bmr !== null && tdee !== null && weight !== null ? (
            <CaloriesClient
              bmr={bmr}
              tdee={tdee}
              weight={weight}
              goal={goal}
              activity={activity}
              activityMultiplier={activityMultiplier}
            />
          ) : null}

        </div>
      </main>
    </div>
  );
}
