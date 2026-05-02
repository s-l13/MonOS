import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fitnessProfiles, calorieCalculations, nutritionPlans, nutritionMeals } from "@/lib/schema";
import { eq, desc, inArray, asc } from "drizzle-orm";
import {
  saveNutritionNotes,
  createNutritionPlan,
  deleteNutritionPlan,
  addMeal,
  deleteMeal,
} from "../actions";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEK_DAYS = [
  { day_name: "saturday",  day_label: "السبت" },
  { day_name: "sunday",    day_label: "الأحد" },
  { day_name: "monday",    day_label: "الاثنين" },
  { day_name: "tuesday",   day_label: "الثلاثاء" },
  { day_name: "wednesday", day_label: "الأربعاء" },
  { day_name: "thursday",  day_label: "الخميس" },
  { day_name: "friday",    day_label: "الجمعة" },
];

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

  // Fetch weekly plans
  const plans = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.user_id, userId));

  const planIds = plans.map((p) => p.id);
  const allMeals =
    planIds.length === 0
      ? []
      : await db
          .select()
          .from(nutritionMeals)
          .where(inArray(nutritionMeals.plan_id, planIds))
          .orderBy(asc(nutritionMeals.meal_order), asc(nutritionMeals.created_at));

  const mealsByPlan = new Map<string, typeof allMeals>();
  for (const meal of allMeals) {
    const bucket = mealsByPlan.get(meal.plan_id) ?? [];
    bucket.push(meal);
    mealsByPlan.set(meal.plan_id, bucket);
  }

  const planByDay = new Map(plans.map((p) => [p.day_name, p]));

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

          {/* ── Macro summary bar ──────────────────────────────────────── */}
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
              {water && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-900/40 bg-blue-950/20 px-4 py-2">
                  <span className="text-blue-300">💧</span>
                  <span className="text-sm text-blue-300 font-semibold">{water} لتر ماء يومياً</span>
                  <span className="text-xs text-gray-500 mr-auto">33 مل × {weight} كغ</span>
                </div>
              )}
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

          {/* ── 7-day weekly plan ──────────────────────────────────────── */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">خطة التغذية الأسبوعية</h2>
            <div className="space-y-3">
              {WEEK_DAYS.map(({ day_name, day_label }) => {
                const plan = planByDay.get(day_name);
                const meals = plan ? (mealsByPlan.get(plan.id) ?? []) : [];

                return (
                  <div key={day_name} className="rounded-xl border border-gray-800 bg-gray-900">
                    <div className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-200">{day_label}</span>
                        {plan?.is_rest_day && (
                          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">راحة</span>
                        )}
                        {plan && !plan.is_rest_day && (
                          <span className="rounded-full bg-green-950 px-2 py-0.5 text-xs text-green-400">
                            {meals.length} وجبة
                          </span>
                        )}
                      </div>
                      {plan ? (
                        <form action={deleteNutritionPlan}>
                          <input type="hidden" name="id" value={plan.id} />
                          <button
                            type="submit"
                            className="text-xs text-red-500 hover:text-red-400 transition"
                          >
                            حذف اليوم
                          </button>
                        </form>
                      ) : (
                        <div className="flex gap-2">
                          <form action={createNutritionPlan} className="flex gap-1">
                            <input type="hidden" name="day_name" value={day_name} />
                            <input type="hidden" name="day_label" value={day_label} />
                            <button
                              type="submit"
                              className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 transition"
                            >
                              + إضافة خطة
                            </button>
                          </form>
                          <form action={createNutritionPlan} className="flex gap-1">
                            <input type="hidden" name="day_name" value={day_name} />
                            <input type="hidden" name="day_label" value={day_label} />
                            <input type="hidden" name="is_rest_day" value="on" />
                            <button
                              type="submit"
                              className="rounded-lg bg-gray-700 px-3 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-600 transition"
                            >
                              يوم راحة
                            </button>
                          </form>
                        </div>
                      )}
                    </div>

                    {plan && !plan.is_rest_day && (
                      <div className="border-t border-gray-800 px-5 pb-4 pt-3 space-y-3">
                        {/* Meal list */}
                        {meals.length > 0 && (
                          <div className="space-y-2">
                            {meals.map((meal) => (
                              <div key={meal.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm text-gray-200">{meal.meal_name}</span>
                                    {meal.meal_time && (
                                      <span className="text-xs text-gray-500">{meal.meal_time}</span>
                                    )}
                                  </div>
                                  {meal.ingredients && (
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{meal.ingredients}</p>
                                  )}
                                  {meal.notes && (
                                    <p className="text-xs text-gray-600 mt-0.5">{meal.notes}</p>
                                  )}
                                </div>
                                <form action={deleteMeal} className="shrink-0">
                                  <input type="hidden" name="id" value={meal.id} />
                                  <button type="submit" className="text-xs text-red-500 hover:text-red-400 transition">
                                    حذف
                                  </button>
                                </form>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add meal form */}
                        <details className="rounded-lg border border-gray-800">
                          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs text-green-400 hover:text-green-300">
                            + إضافة وجبة
                          </summary>
                          <div className="border-t border-gray-800 px-3 pb-3 pt-2">
                            <form action={addMeal} className="space-y-2">
                              <input type="hidden" name="plan_id" value={plan.id} />
                              <input type="hidden" name="meal_order" value={String(meals.length)} />
                              <div className="flex gap-2">
                                <input
                                  name="meal_name"
                                  required
                                  placeholder="اسم الوجبة *"
                                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                                />
                                <input
                                  name="meal_time"
                                  placeholder="الوقت (7ص)"
                                  className="w-24 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                                />
                              </div>
                              <textarea
                                name="ingredients"
                                placeholder="المكونات والمقادير..."
                                rows={2}
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none resize-none"
                              />
                              <input
                                name="notes"
                                placeholder="ملاحظات إضافية..."
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                              />
                              <button
                                type="submit"
                                className="w-full rounded-lg bg-green-700 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition"
                              >
                                إضافة الوجبة
                              </button>
                            </form>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

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

          {/* ── Nutrition notes ──────────────────────────────────────── */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">ملاحظاتي الغذائية</h2>
            <p className="mb-3 text-xs text-gray-600">
              ملاحظات حرة — أطعمة تتجنبها، مكملات، أي شيء تريد تذكره.
            </p>
            <form action={saveNutritionNotes} className="space-y-3">
              <textarea
                name="nutrition_notes"
                rows={6}
                defaultValue={fp?.nutrition_notes ?? ""}
                placeholder="ملاحظاتك الغذائية الشخصية..."
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

        </div>
      </main>
    </div>
  );
}
