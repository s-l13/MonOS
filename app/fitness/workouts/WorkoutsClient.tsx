"use client";

import { useState } from "react";
import type {
  workoutPlans,
  workoutPlanDays,
  workoutExercises,
  exerciseLibrary,
} from "@/lib/schema";
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
  addExercise,
  updateExercise,
  deleteExercise,
} from "../actions";

// ---------------------------------------------------------------------------
// Types (exported so page.tsx can annotate the data it passes)
// ---------------------------------------------------------------------------

export type ExRow = {
  we: typeof workoutExercises.$inferSelect;
  ex: typeof exerciseLibrary.$inferSelect;
};
export type DayFull  = typeof workoutPlanDays.$inferSelect & { exercises: ExRow[] };
export type PlanFull = typeof workoutPlans.$inferSelect    & { days: DayFull[] };
export type LibEx    = typeof exerciseLibrary.$inferSelect;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_OPTIONS = [
  "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة",
];

const DAY_LABEL_OPTIONS = [
  "صدر وترايسبس", "ظهر وبايسبس", "أرجل", "كتف",
  "كارديو", "راحة", "كامل الجسم",
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
// Shared style constants
// ---------------------------------------------------------------------------

const INP       = "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none";
const SMALL_INP = "rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none";
const BTN_BLUE  = "rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600";

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

export default function WorkoutsClient({
  initialPlans,
  allLibExercises,
}: {
  initialPlans:     PlanFull[];
  allLibExercises:  LibEx[];
}) {
  return (
    <div className="space-y-6">
      {/* ── Create new plan ─────────────────────────────────────────── */}
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

      {/* ── Plans list ──────────────────────────────────────────────── */}
      {initialPlans.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-10 text-center text-sm text-gray-600">
          لا توجد خطط تدريب بعد — أنشئ خطة أعلاه
        </div>
      ) : (
        <div className="space-y-6">
          {initialPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} allLibExercises={allLibExercises} />
          ))}
        </div>
      )}

      {/* ── Exercise library ────────────────────────────────────────── */}
      <ExerciseLibrarySection exercises={allLibExercises} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------

function PlanCard({ plan, allLibExercises }: { plan: PlanFull; allLibExercises: LibEx[] }) {
  const completedCount = plan.days.reduce(
    (s, d) => s + d.exercises.filter((e) => e.we.is_completed).length, 0,
  );
  const totalCount = plan.days.reduce((s, d) => s + d.exercises.length, 0);

  function handleDeletePlan(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm("هل تريد حذف هذه الخطة؟ سيتم حذف جميع الأيام والتمارين المرتبطة بها.")) {
      e.preventDefault();
    }
  }

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
        <div className="flex shrink-0 items-center gap-3">
          {/* Edit plan dropdown */}
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
          <form action={deleteWorkoutPlan} onSubmit={handleDeletePlan}>
            <input type="hidden" name="id" value={plan.id} />
            <button type="submit" className="text-xs text-red-700 hover:text-red-500">حذف</button>
          </form>
        </div>
      </div>

      {/* Days */}
      {plan.days.length > 0 && (
        <div className="space-y-3 px-5 pb-3">
          {plan.days.map((day) => (
            <DayCard key={day.id} day={day} allLibExercises={allLibExercises} />
          ))}
        </div>
      )}
      {plan.days.length === 0 && (
        <p className="px-5 pb-3 text-xs text-gray-600">لا أيام تدريب بعد — أضف يوماً أدناه</p>
      )}

      {/* Add day */}
      <details className="border-t border-gray-800">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-xs text-blue-400 hover:text-blue-300">
          <span>+</span>
          <span>إضافة يوم تدريب</span>
        </summary>
        <div className="border-t border-gray-800 bg-gray-800/30 px-5 py-4">
          <form action={addPlanDay} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="plan_id" value={plan.id} />
            <div>
              <label className="mb-1 block text-xs text-gray-400">اليوم</label>
              <select name="day_name" className={SMALL_INP}>
                {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">التسمية</label>
              <select name="day_label" className={SMALL_INP}>
                <option value="">— اختر —</option>
                {DAY_LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
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
// DayCard
// ---------------------------------------------------------------------------

function DayCard({ day, allLibExercises }: { day: DayFull; allLibExercises: LibEx[] }) {
  const completedCount = day.exercises.filter((e) => e.we.is_completed).length;

  function handleDeleteDay(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm("حذف هذا اليوم وجميع تمارينه؟")) e.preventDefault();
  }

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
            <span className="text-xs text-gray-600">{completedCount}/{day.exercises.length}</span>
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
                    {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">التسمية</label>
                  <select name="day_label" defaultValue={day.day_label ?? ""} className={SMALL_INP + " w-full"}>
                    <option value="">— لا تسمية —</option>
                    {DAY_LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <button type="submit" className={BTN_BLUE + " w-full"}>حفظ</button>
              </form>
            </div>
          </details>
          {/* Delete day */}
          <form action={deletePlanDay} onSubmit={handleDeleteDay}>
            <input type="hidden" name="id" value={day.id} />
            <button type="submit" className="text-xs text-red-800 hover:text-red-600">حذف</button>
          </form>
        </div>
      </div>

      {/* Exercises */}
      {day.exercises.length > 0 && (
        <div className="divide-y divide-gray-700/50 border-t border-gray-700/50">
          {day.exercises.map((row) => <ExerciseRow key={row.we.id} row={row} />)}
        </div>
      )}
      {day.exercises.length === 0 && (
        <p className="px-4 pb-2 text-xs text-gray-700">لا تمارين — أضف تمريناً أدناه</p>
      )}

      {/* Add exercise */}
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
                <input name="sets" type="number" min="1" defaultValue="3" className={SMALL_INP + " w-16"} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">رابس</label>
                <input name="reps" type="number" min="1" defaultValue="10" className={SMALL_INP + " w-16"} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">وزن (كغ)</label>
                <input name="weight" type="number" step="0.5" placeholder="—" className={SMALL_INP + " w-20"} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">راحة (ث)</label>
                <input name="rest_seconds" type="number" defaultValue="60" className={SMALL_INP + " w-20"} />
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
// ExerciseRow
// ---------------------------------------------------------------------------

function ExerciseRow({ row }: { row: ExRow }) {
  const { we, ex } = row;
  const isCompleted = we.is_completed ?? false;

  return (
    <div className={`px-4 py-3 ${isCompleted ? "opacity-60" : ""}`}>
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
            {isCompleted ? "✓" : ""}
          </button>
        </form>

        {/* Name + stats */}
        <div className="min-w-0 flex-1">
          <span className={`text-sm font-medium ${isCompleted ? "line-through text-gray-500" : "text-gray-200"}`}>
            {ex.name_ar}
          </span>
          <span className="mr-2 text-xs text-gray-500">
            {we.sets}×{we.reps}
            {we.weight ? ` @ ${we.weight}كغ` : ""}
            {we.rest_seconds && we.rest_seconds !== 60 ? ` • ${we.rest_seconds}ث` : ""}
          </span>
          {we.notes && <span className="mt-0.5 block text-xs text-gray-600">{we.notes}</span>}
        </div>

        {/* Inline edit */}
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
                  <input name="weight" type="number" step="0.5" defaultValue={we.weight ?? ""}
                    className={SMALL_INP + " w-16"} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-400">راحة (ث)</label>
                  <input name="rest_seconds" type="number" defaultValue={we.rest_seconds ?? 60}
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
          <button type="submit" className="shrink-0 text-xs text-red-800 hover:text-red-600">حذف</button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExerciseLibrarySection
// ---------------------------------------------------------------------------

const DIFFICULTY_AR: Record<string, string> = {
  easy: "سهل", medium: "متوسط", hard: "صعب",
};
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "bg-green-950 text-green-400",
  medium: "bg-yellow-950 text-yellow-400",
  hard: "bg-red-950 text-red-400",
};

function ExerciseLibrarySection({ exercises }: { exercises: LibEx[] }) {
  const [filter,    setFilter]    = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const groups  = Array.from(new Set(exercises.map((e) => e.muscle_group)));
  const visible = filter === "all" ? exercises : exercises.filter((e) => e.muscle_group === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400">مكتبة التمارين الخاصة بك</h2>
        <span className="text-xs text-gray-600">{exercises.length} تمرين</span>
      </div>

      {/* Add new exercise */}
      <details className="rounded-xl border border-gray-800 bg-gray-900">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3">
          <span className="text-sm font-semibold text-green-400">+ إضافة تمرين جديد</span>
          <span className="text-xs text-gray-600">انقر للفتح</span>
        </summary>
        <div className="border-t border-gray-800 px-5 pb-5 pt-4">
          <form action={addExercise} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-400">اسم التمرين بالعربية *</label>
              <input name="name_ar" required placeholder="بنش برس" className={INP} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-400">الاسم بالإنجليزية</label>
              <input name="name_en" placeholder="Bench Press" className={INP} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">المجموعة العضلية *</label>
              <select name="muscle_group" required className={INP}>
                {Object.entries(MUSCLE_AR).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">الصعوبة</label>
              <select name="difficulty" className={INP}>
                {Object.entries(DIFFICULTY_AR).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-400">الأدوات / المعدات</label>
              <input name="equipment" placeholder="باربل، دمبل، كابل..." className={INP} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-400">رابط الفيديو (اختياري)</label>
              <input name="video_url" type="url" placeholder="https://..." className={INP} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-400">وصف / ملاحظات</label>
              <textarea name="description" rows={2} placeholder="طريقة الأداء..." className={INP + " resize-none"} />
            </div>
            <button type="submit" className="col-span-2 rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600">
              إضافة التمرين
            </button>
          </form>
        </div>
      </details>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-xs transition ${
            filter === "all"
              ? "bg-blue-700 text-white"
              : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          الكل
        </button>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              filter === g
                ? "bg-blue-700 text-white"
                : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {MUSCLE_AR[g] ?? g}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((ex) => (
          <div key={ex.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
            {editingId === ex.id ? (
              /* Edit form */
              <form action={updateExercise} onSubmit={() => setEditingId(null)} className="space-y-2">
                <input type="hidden" name="id" value={ex.id} />
                <input name="name_ar" required defaultValue={ex.name_ar} placeholder="الاسم بالعربية" className={SMALL_INP + " w-full"} />
                <input name="name_en" defaultValue={ex.name_en} placeholder="English name" className={SMALL_INP + " w-full"} />
                <select name="muscle_group" defaultValue={ex.muscle_group} className={SMALL_INP + " w-full"}>
                  {Object.entries(MUSCLE_AR).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <input name="equipment" defaultValue={ex.equipment ?? ""} placeholder="المعدات" className={SMALL_INP + " w-full"} />
                <select name="difficulty" defaultValue={ex.difficulty ?? "medium"} className={SMALL_INP + " w-full"}>
                  {Object.entries(DIFFICULTY_AR).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <input name="video_url" type="url" defaultValue={ex.video_url ?? ""} placeholder="https://..." className={SMALL_INP + " w-full"} />
                <textarea name="description" defaultValue={ex.description ?? ""} rows={2} className={SMALL_INP + " w-full resize-none"} />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded-lg bg-blue-700 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition">
                    حفظ
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="flex-1 rounded-lg bg-gray-700 py-1.5 text-xs text-gray-300 hover:bg-gray-600 transition">
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              /* Display */
              <>
                <div>
                  <p className="font-bold text-sm text-gray-100">{ex.name_ar}</p>
                  {ex.name_en && <p className="text-xs text-gray-500">{ex.name_en}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-300">
                    {MUSCLE_AR[ex.muscle_group] ?? ex.muscle_group}
                  </span>
                  {ex.equipment && (
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      {ex.equipment}
                    </span>
                  )}
                  {ex.difficulty && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${DIFFICULTY_COLOR[ex.difficulty] ?? "bg-gray-800 text-gray-400"}`}>
                      {DIFFICULTY_AR[ex.difficulty] ?? ex.difficulty}
                    </span>
                  )}
                </div>
                {ex.description && (
                  <p className="text-xs text-gray-600 leading-relaxed">{ex.description}</p>
                )}
                {ex.video_url && (
                  <a
                    href={ex.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    ▶ شاهد الفيديو
                  </a>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditingId(ex.id)}
                    className="rounded-lg bg-gray-800 px-3 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition"
                  >
                    تعديل
                  </button>
                  <form action={deleteExercise} onSubmit={(e) => {
                    if (!confirm("حذف هذا التمرين نهائياً؟")) e.preventDefault();
                  }}>
                    <input type="hidden" name="id" value={ex.id} />
                    <button type="submit" className="rounded-lg bg-gray-800 px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-gray-700 transition">
                      حذف
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
