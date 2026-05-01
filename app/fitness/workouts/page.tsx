import Sidebar from "@/components/sidebar";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  workoutPlans,
  workoutPlanDays,
  workoutExercises,
  exerciseLibrary,
} from "@/lib/schema";
import { eq, asc, desc, inArray } from "drizzle-orm";
import {
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  addPlanDay,
  updatePlanDay,
  deletePlanDay,
  addExerciseToDay,
  updateExerciseInDay,
  removeExerciseFromDay,
  toggleExerciseComplete,
} from "../actions";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_OPTIONS = [
  "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة",
];

const DAY_LABEL_OPTIONS = [
  "صدر وترايسبس",
  "ظهر وبايسبس",
  "أرجل",
  "كتف",
  "كارديو",
  "راحة",
  "كامل الجسم",
];

const GOAL_AR: Record<string, string> = {
  weight_loss:    "تخسيس",
  weight_gain:    "زيادة الوزن",
  muscle_gain:    "بناء العضلات",
  cutting:        "تحديد",
  general_health: "صحة عامة",
  strength:       "قوة",
  endurance:      "تحمل",
};

const MUSCLE_AR: Record<string, string> = {
  chest: "صدر", back: "ظهر", legs: "أرجل", shoulders: "أكتاف",
  biceps: "بايسبس", triceps: "ترايسبس", core: "كور", cardio: "كارديو",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExRow = {
  we: typeof workoutExercises.$inferSelect;
  ex: typeof exerciseLibrary.$inferSelect;
};

type DayFull = typeof workoutPlanDays.$inferSelect & { exercises: ExRow[] };
type PlanFull = typeof workoutPlans.$inferSelect & { days: DayFull[] };

// ---------------------------------------------------------------------------
// Input / Select classes (shared)
// ---------------------------------------------------------------------------

const INP = "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none";
const SMALL_INP = "rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none";
const BTN_BLUE = "rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600";
const BTN_GHOST = "rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-200";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function WorkoutsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  // Fetch plans
  const plans = await db
    .select()
    .from(workoutPlans)
    .where(eq(workoutPlans.user_id, userId))
    .orderBy(desc(workoutPlans.created_at));

  const planIds = plans.map((p) => p.id);

  // Fetch all days for all plans
  const allDays =
    planIds.length === 0
      ? []
      : await db
          .select()
          .from(workoutPlanDays)
          .where(inArray(workoutPlanDays.plan_id, planIds))
          .orderBy(asc(workoutPlanDays.order_index));

  const dayIds = allDays.map((d) => d.id);

  // Fetch all workout_exercises joined with exercise_library
  const allWE: ExRow[] =
    dayIds.length === 0
      ? []
      : await db
          .select({ we: workoutExercises, ex: exerciseLibrary })
          .from(workoutExercises)
          .innerJoin(exerciseLibrary, eq(workoutExercises.exercise_id, exerciseLibrary.id))
          .where(inArray(workoutExercises.day_id, dayIds))
          .orderBy(asc(workoutExercises.created_at));

  // Fetch full exercise library for the add-exercise dropdown
  const allLibExercises = await db
    .select()
    .from(exerciseLibrary)
    .orderBy(asc(exerciseLibrary.muscle_group), asc(exerciseLibrary.name_ar));

  // Build nested structure
  const exByDay: Record<string, ExRow[]> = {};
  for (const row of allWE) {
    if (!exByDay[row.we.day_id]) exByDay[row.we.day_id] = [];
    exByDay[row.we.day_id].push(row);
  }

  const daysByPlan: Record<string, DayFull[]> = {};
  for (const day of allDays) {
    if (!daysByPlan[day.plan_id]) daysByPlan[day.plan_id] = [];
    daysByPlan[day.plan_id].push({ ...day, exercises: exByDay[day.id] ?? [] });
  }

  const plansWithDays: PlanFull[] = plans.map((p) => ({
    ...p,
    days: daysByPlan[p.id] ?? [],
  }));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">
              ← الصحة والرياضة
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">جدول التمارين</h1>
          </div>

          {/* ── Create new plan (collapsible) ──────────────────────────── */}
          <details className="rounded-xl border border-gray-800 bg-gray-900">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
              <span className="text-sm font-semibold text-gray-300">+ إنشاء خطة تدريب جديدة</span>
              <span className="text-xs text-gray-600">انقر للفتح</span>
            </summary>
            <div className="border-t border-gray-800 px-5 pb-5 pt-4">
              <form action={createWorkoutPlan} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-gray-400">اسم الخطة</label>
                    <input name="name" required placeholder="خطة القوة — 12 أسبوع" className={INP} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">الهدف</label>
                    <select name="goal" className={INP}>
                      {Object.entries(GOAL_AR).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">أيام/أسبوع</label>
                    <input name="days_per_week" type="number" min="1" max="7" defaultValue="3" className={INP} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">تاريخ البدء</label>
                    <input name="start_date" type="date" className={INP} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">تاريخ الانتهاء</label>
                    <input name="end_date" type="date" className={INP} />
                  </div>
                </div>
                <button type="submit" className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
                  إنشاء الخطة
                </button>
              </form>
            </div>
          </details>

          {/* ── Plans list ─────────────────────────────────────────────── */}
          {plansWithDays.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 py-10 text-center text-sm text-gray-600">
              لا توجد خطط تدريب بعد — أنشئ خطة أعلاه
            </div>
          ) : (
            <div className="space-y-6">
              {plansWithDays.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  allLibExercises={allLibExercises}
                />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard component
// ---------------------------------------------------------------------------

function PlanCard({
  plan,
  allLibExercises,
}: {
  plan: PlanFull;
  allLibExercises: typeof exerciseLibrary.$inferSelect[];
}) {
  const completedCount = plan.days.reduce(
    (s, d) => s + d.exercises.filter((e) => e.we.is_completed).length,
    0,
  );
  const totalCount = plan.days.reduce((s, d) => s + d.exercises.length, 0);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900">
      {/* Plan header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-100">{plan.name}</h3>
            {plan.is_active && (
              <span className="rounded-full bg-green-950 px-2 py-0.5 text-xs text-green-400">نشطة</span>
            )}
            {plan.goal && (
              <span className="rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-400">
                {GOAL_AR[plan.goal] ?? plan.goal}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {plan.days_per_week} أيام/أسبوع
            {plan.start_date && ` • من ${plan.start_date}`}
            {plan.end_date && ` إلى ${plan.end_date}`}
            {totalCount > 0 && ` • ${completedCount}/${totalCount} مكتملة`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Edit plan */}
          <details className="relative">
            <summary className="list-none cursor-pointer text-xs text-blue-400 hover:text-blue-300">
              تعديل
            </summary>
            <div className="absolute left-0 top-7 z-20 w-72 rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-2xl">
              <form action={updateWorkoutPlan} className="space-y-3">
                <input type="hidden" name="id" value={plan.id} />
                <div>
                  <label className="mb-1 block text-xs text-gray-400">اسم الخطة</label>
                  <input name="name" defaultValue={plan.name} required className={SMALL_INP + " w-full"} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">الهدف</label>
                    <select name="goal" defaultValue={plan.goal ?? ""} className={SMALL_INP + " w-full"}>
                      {Object.entries(GOAL_AR).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">أيام/أسبوع</label>
                    <input name="days_per_week" type="number" min="1" max="7"
                      defaultValue={plan.days_per_week ?? 3} className={SMALL_INP + " w-full"} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">من</label>
                    <input name="start_date" type="date" defaultValue={plan.start_date ?? ""}
                      className={SMALL_INP + " w-full"} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">إلى</label>
                    <input name="end_date" type="date" defaultValue={plan.end_date ?? ""}
                      className={SMALL_INP + " w-full"} />
                  </div>
                </div>
                <input type="hidden" name="is_active" value={String(plan.is_active ?? true)} />
                <button type="submit" className={BTN_BLUE + " w-full"}>حفظ التعديلات</button>
              </form>
            </div>
          </details>
          {/* Delete plan */}
          <form action={deleteWorkoutPlan}>
            <input type="hidden" name="id" value={plan.id} />
            <button type="submit" className="text-xs text-red-700 hover:text-red-500"
              onClick={(e) => { if (!confirm("حذف الخطة؟")) e.preventDefault(); }}>
              حذف
            </button>
          </form>
        </div>
      </div>

      {/* Days */}
      {plan.days.length > 0 && (
        <div className="space-y-3 px-5 pb-3">
          {plan.days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              allLibExercises={allLibExercises}
            />
          ))}
        </div>
      )}

      {plan.days.length === 0 && (
        <p className="px-5 pb-3 text-xs text-gray-600">لا أيام تدريب بعد — أضف يوماً أدناه</p>
      )}

      {/* Add day (collapsible) */}
      <details className="border-t border-gray-800">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-xs text-blue-400 hover:text-blue-300">
          <span>+</span>
          <span>إضافة يوم تدريب</span>
        </summary>
        <div className="border-t border-gray-800 bg-gray-800/30 px-5 py-4">
          <form action={addPlanDay} className="flex flex-wrap gap-3 items-end">
            <input type="hidden" name="plan_id" value={plan.id} />
            <div>
              <label className="mb-1 block text-xs text-gray-400">اليوم</label>
              <select name="day_name" className={SMALL_INP}>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">التسمية</label>
              <select name="day_label" className={SMALL_INP}>
                <option value="">— اختر —</option>
                {DAY_LABEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <button type="submit" className={BTN_BLUE}>إضافة اليوم</button>
          </form>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayCard component
// ---------------------------------------------------------------------------

function DayCard({
  day,
  allLibExercises,
}: {
  day: DayFull;
  allLibExercises: typeof exerciseLibrary.$inferSelect[];
}) {
  const completedCount = day.exercises.filter((e) => e.we.is_completed).length;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50">
      {/* Day header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-200">{day.day_name}</span>
          {day.day_label && (
            <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
              {day.day_label}
            </span>
          )}
          {day.exercises.length > 0 && (
            <span className="text-xs text-gray-600">
              {completedCount}/{day.exercises.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Edit day */}
          <details className="relative">
            <summary className="list-none cursor-pointer text-xs text-gray-500 hover:text-gray-300">تعديل</summary>
            <div className="absolute left-0 top-6 z-20 w-64 rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-2xl">
              <form action={updatePlanDay} className="space-y-2">
                <input type="hidden" name="id" value={day.id} />
                <div>
                  <label className="mb-1 block text-xs text-gray-400">اليوم</label>
                  <select name="day_name" defaultValue={day.day_name} className={SMALL_INP + " w-full"}>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">التسمية</label>
                  <select name="day_label" defaultValue={day.day_label ?? ""} className={SMALL_INP + " w-full"}>
                    <option value="">— لا تسمية —</option>
                    {DAY_LABEL_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className={BTN_BLUE + " w-full"}>حفظ</button>
              </form>
            </div>
          </details>
          {/* Delete day */}
          <form action={deletePlanDay}>
            <input type="hidden" name="id" value={day.id} />
            <button type="submit" className="text-xs text-red-800 hover:text-red-600">حذف</button>
          </form>
        </div>
      </div>

      {/* Exercises */}
      {day.exercises.length > 0 && (
        <div className="divide-y divide-gray-700/50 border-t border-gray-700/50">
          {day.exercises.map((row) => (
            <ExerciseRow key={row.we.id} row={row} />
          ))}
        </div>
      )}

      {day.exercises.length === 0 && (
        <p className="px-4 pb-2 text-xs text-gray-700">لا تمارين — أضف تمريناً أدناه</p>
      )}

      {/* Add exercise (collapsible) */}
      <details className="border-t border-gray-700/50">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-xs text-blue-500 hover:text-blue-400">
          <span>+</span>
          <span>إضافة تمرين</span>
        </summary>
        <div className="bg-gray-900/40 px-4 py-3">
          <form action={addExerciseToDay} className="space-y-3">
            <input type="hidden" name="day_id" value={day.id} />
            <div>
              <label className="mb-1 block text-xs text-gray-400">التمرين</label>
              <select name="exercise_id" required className={SMALL_INP + " w-full"}>
                <option value="">— اختر تمريناً —</option>
                {allLibExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name_ar} ({MUSCLE_AR[ex.muscle_group] ?? ex.muscle_group})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <div>
                <label className="mb-1 block text-xs text-gray-400">سيتات</label>
                <input name="sets" type="number" min="1" defaultValue="3"
                  className={SMALL_INP + " w-16"} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">رابس</label>
                <input name="reps" type="number" min="1" defaultValue="10"
                  className={SMALL_INP + " w-16"} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">وزن (كغ)</label>
                <input name="weight" type="number" step="0.5" placeholder="—"
                  className={SMALL_INP + " w-20"} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">راحة (ث)</label>
                <input name="rest_seconds" type="number" defaultValue="60"
                  className={SMALL_INP + " w-20"} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">ملاحظات</label>
              <input name="notes" placeholder="اختياري" className={SMALL_INP + " w-full"} />
            </div>
            <button type="submit" className={BTN_BLUE}>إضافة التمرين</button>
          </form>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExerciseRow component
// ---------------------------------------------------------------------------

function ExerciseRow({ row }: { row: ExRow }) {
  const { we, ex } = row;
  const isCompleted = we.is_completed ?? false;

  return (
    <div className={`px-4 py-3 ${isCompleted ? "opacity-60" : ""}`}>
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Complete toggle */}
        <form action={toggleExerciseComplete}>
          <input type="hidden" name="id" value={we.id} />
          <input type="hidden" name="is_completed" value={String(isCompleted)} />
          <button
            type="submit"
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition ${
              isCompleted
                ? "border-green-600 bg-green-600 text-white"
                : "border-gray-600 bg-transparent hover:border-gray-400"
            }`}
          >
            {isCompleted && "✓"}
          </button>
        </form>

        {/* Exercise name + stats */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${isCompleted ? "line-through text-gray-500" : "text-gray-200"}`}>
            {ex.name_ar}
          </span>
          <span className="mr-2 text-xs text-gray-500">
            {we.sets}×{we.reps}
            {we.weight && ` @ ${we.weight}كغ`}
            {we.rest_seconds && we.rest_seconds !== 60 && ` • ${we.rest_seconds}ث`}
          </span>
          {we.notes && <span className="block text-xs text-gray-600 mt-0.5">{we.notes}</span>}
        </div>

        {/* Edit exercise (inline collapsible) */}
        <details className="relative shrink-0">
          <summary className="list-none cursor-pointer text-xs text-gray-600 hover:text-gray-400">تعديل</summary>
          <div className="absolute left-0 top-6 z-20 w-64 rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-2xl">
            <form action={updateExerciseInDay} className="space-y-2">
              <input type="hidden" name="id" value={we.id} />
              <div className="flex gap-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">سيتات</label>
                  <input name="sets" type="number" min="1" defaultValue={we.sets ?? 3}
                    className={SMALL_INP + " w-16"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">رابس</label>
                  <input name="reps" type="number" min="1" defaultValue={we.reps ?? 10}
                    className={SMALL_INP + " w-16"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">وزن</label>
                  <input name="weight" type="number" step="0.5"
                    defaultValue={we.weight ?? ""}
                    className={SMALL_INP + " w-16"} />
                </div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-400">راحة (ث)</label>
                  <input name="rest_seconds" type="number"
                    defaultValue={we.rest_seconds ?? 60}
                    className={SMALL_INP + " w-full"} />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-400">ملاحظات</label>
                  <input name="notes" defaultValue={we.notes ?? ""}
                    className={SMALL_INP + " w-full"} />
                </div>
              </div>
              <button type="submit" className={BTN_BLUE + " w-full"}>حفظ</button>
            </form>
          </div>
        </details>

        {/* Delete exercise */}
        <form action={removeExerciseFromDay}>
          <input type="hidden" name="id" value={we.id} />
          <button type="submit" className="text-xs text-red-800 hover:text-red-600 shrink-0">
            حذف
          </button>
        </form>
      </div>
    </div>
  );
}
