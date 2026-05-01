import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fitnessProfiles, calorieCalculations } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { saveNutritionNotes } from "../actions";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Goal-based tips
// ---------------------------------------------------------------------------

const GOAL_TIPS: Record<string, { title: string; tips: string[] }> = {
  weight_loss: {
    title: "نصائح التخسيس",
    tips: [
      "ركز على عجز السعرات 300–500 سعر يومياً",
      "زد كمية البروتين للحفاظ على العضلات أثناء الكورس",
      "قلل الكربوهيدرات المكررة والسكريات المضافة",
      "اشرب ماء كافياً قبل الوجبات للشعور بالامتلاء",
      "لا تتخطَ وجبة الإفطار — تُحسّن التمثيل الغذائي",
    ],
  },
  muscle_gain: {
    title: "نصائح بناء العضلات",
    tips: [
      "ركز على فائض السعرات 200–300 سعر يومياً",
      "تناول 1.6–2.2 غ بروتين لكل كيلو من وزنك",
      "وزّع البروتين على 4–5 وجبات يومياً",
      "تناول الكربوهيدرات قبل التمرين وبعده مباشرة",
      "النوم الجيد (7–9 ساعات) ضروري لبناء العضلات",
    ],
  },
  cutting: {
    title: "نصائح التحديد",
    tips: [
      "حافظ على البروتين العالي لمنع فقد العضلات",
      "قلل الكربوهيدرات تدريجياً — لا تقطعها فجأة",
      "استخدم تقنية Carb Cycling: كربوهيدرات عالية أيام التمرين",
      "زد الكارديو تدريجياً بدلاً من خفض السعرات أكثر",
      "راقب الوزن أسبوعياً وقس المحيطات شهرياً",
    ],
  },
  weight_gain: {
    title: "نصائح زيادة الوزن",
    tips: [
      "زد السعرات بشكل تدريجي (+300 يومياً)",
      "تناول وجبات أكبر وأكثر تكراراً — كل 3 ساعات",
      "ركز على الأطعمة ذات الكثافة الكالورية العالية",
      "المكسرات وزبدة الفول السوداني والأفوكادو خيارات ممتازة",
      "لا تهمل التمرين لضمان كسب عضلي لا دهني فقط",
    ],
  },
  strength: {
    title: "نصائح بناء القوة",
    tips: [
      "تناول وجبة غنية بالكربوهيدرات قبل التمرين",
      "الكرياتين مونوهيدرات (5غ/يوم) يحسّن الأداء",
      "البروتين الكافي ضروري للتكيف العضلي",
      "السكريات البسيطة بعد التمرين تسرّع الاسترداد",
      "لا تهمل الكالسيوم وفيتامين D لصحة العظام",
    ],
  },
  endurance: {
    title: "نصائح تمارين التحمل",
    tips: [
      "الكربوهيدرات هي وقود رياضيي التحمل الأساسي",
      "الترطيب المستمر قبل وأثناء وبعد التمرين",
      "الأملاح المعدنية (صوديوم، بوتاسيوم) مهمة لمنع التشنج",
      "تناول كربوهيدرات سريعة الهضم كل 45–60 دقيقة",
      "الاسترداد بالبروتين + الكربوهيدرات خلال 30 دقيقة",
    ],
  },
  general_health: {
    title: "نصائح الصحة العامة",
    tips: [
      "تناول 5 حصص خضار وفاكهة يومياً",
      "اختار الحبوب الكاملة على المكررة دائماً",
      "قلل الصوديوم والسكريات المضافة",
      "تناول الأسماك الدهنية مرتين أسبوعياً على الأقل",
      "لا تجلس أكثر من ساعتين متواصلتين — قف وتحرك",
    ],
  },
};

const WATER_ML_PER_KG = 0.033;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function NutritionPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const [profileRows, calcRows] = await Promise.all([
    db.select().from(fitnessProfiles).where(eq(fitnessProfiles.user_id, userId)).limit(1),
    db.select().from(calorieCalculations).where(eq(calorieCalculations.user_id, userId))
      .orderBy(desc(calorieCalculations.created_at)).limit(1),
  ]);

  const fp   = profileRows[0] ?? null;
  const calc = calcRows[0] ?? null;
  const goal = fp?.goal ?? "general_health";
  const tips = GOAL_TIPS[goal] ?? GOAL_TIPS.general_health;

  const weight = fp?.current_weight ? parseFloat(String(fp.current_weight)) : null;
  const water  = weight ? (weight * WATER_ML_PER_KG).toFixed(1) : null;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">
              ← الصحة والرياضة
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">التغذية</h1>
          </div>

          {/* ── Recommended macros ──────────────────────────────────── */}
          {calc ? (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400">الماكرو الموصى به</h2>
                <Link href="/fitness/calories" className="text-xs text-blue-500 hover:text-blue-300">
                  إعادة الحساب →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {([
                  { label: "السعرات المستهدفة", val: calc.target_calories, color: "text-blue-400",   unit: "سعر" },
                  { label: "بروتين",            val: calc.protein_g,       color: "text-green-400",  unit: "غ" },
                  { label: "كارب",              val: calc.carbs_g,         color: "text-yellow-400", unit: "غ" },
                  { label: "دهون",              val: calc.fat_g,           color: "text-red-400",    unit: "غ" },
                ] as const).map(({ label, val, color, unit }) => (
                  <div key={label} className="rounded-xl border border-gray-800 bg-gray-800 p-3 text-center">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`mt-1 text-lg font-bold ${color}`}>
                      {val ? Math.round(parseFloat(String(val))) : "—"} {unit}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card>
              <p className="py-4 text-center text-sm text-gray-500">
                احسب ماكروك أولاً في{" "}
                <Link href="/fitness/calories" className="text-blue-400 hover:underline">
                  حاسبة السعرات
                </Link>
              </p>
            </Card>
          )}

          {/* ── Water intake ─────────────────────────────────────────── */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">الماء اليومي</h2>
            {water ? (
              <div className="flex items-center gap-4">
                <span className="text-4xl">💧</span>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{water} لتر</p>
                  <p className="text-xs text-gray-500">
                    يومياً — 33 مل لكل كيلو (وزنك الحالي: {weight} كغ)
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                أدخل وزنك في{" "}
                <Link href="/fitness/profile" className="text-blue-400 hover:underline">
                  الملف الرياضي
                </Link>{" "}
                لحساب كمية الماء الموصى بها.
              </p>
            )}
          </Card>

          {/* ── Goal-based tips ──────────────────────────────────────── */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">{tips.title}</h2>
            <ul className="space-y-3">
              {tips.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-blue-300">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </Card>

          {/* ── Nutrition notes (editable) ───────────────────────────── */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">ملاحظاتي الغذائية</h2>
            <p className="mb-3 text-xs text-gray-600">
              خطة وجباتك الشخصية، أوقات الأكل، الأطعمة التي تتجنبها، أي ملاحظات تريد تذكرها.
            </p>
            <form action={saveNutritionNotes} className="space-y-3">
              <textarea
                name="nutrition_notes"
                rows={8}
                defaultValue={fp?.nutrition_notes ?? ""}
                placeholder={`مثال:\nوجبة 1 (7ص): شوفان + بياض بيض\nوجبة 2 (10ص): تمر + مكسرات\nوجبة 3 (1م): أرز + دجاج + سلطة\nوجبة 4 (4م): بروتين شيك\nوجبة 5 (7م): سمك + خضار`}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-700 focus:border-blue-600 focus:outline-none leading-relaxed"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                حفظ الملاحظات
              </button>
            </form>
          </Card>

          {/* ── Macro quick-reference ────────────────────────────────── */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">مرجع سريع</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { title: "البروتين", desc: "4 سعر/غرام — بناء العضلات والترميم", emoji: "🥩" },
                { title: "الكربوهيدرات", desc: "4 سعر/غرام — الطاقة والأداء", emoji: "🍚" },
                { title: "الدهون", desc: "9 سعر/غرام — هرمونات وامتصاص الفيتامينات", emoji: "🥑" },
              ].map(({ title, desc, emoji }) => (
                <div key={title} className="rounded-lg border border-gray-800 bg-gray-800 p-4">
                  <span className="text-2xl">{emoji}</span>
                  <p className="mt-2 font-semibold text-gray-200">{title}</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}
