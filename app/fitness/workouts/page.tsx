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
import Link from "next/link";
import WorkoutsClient from "./WorkoutsClient";
import type { PlanFull, DayFull, ExRow } from "./WorkoutsClient";

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

  // Fetch all days
  const allDays: typeof workoutPlanDays.$inferSelect[] =
    planIds.length === 0
      ? []
      : await db
          .select()
          .from(workoutPlanDays)
          .where(inArray(workoutPlanDays.plan_id, planIds))
          .orderBy(asc(workoutPlanDays.order_index));

  const dayIds = allDays.map((d) => d.id);

  // Fetch all exercises joined with library
  const allWE: ExRow[] =
    dayIds.length === 0
      ? []
      : await db
          .select({ we: workoutExercises, ex: exerciseLibrary })
          .from(workoutExercises)
          .innerJoin(exerciseLibrary, eq(workoutExercises.exercise_id, exerciseLibrary.id))
          .where(inArray(workoutExercises.day_id, dayIds))
          .orderBy(asc(workoutExercises.created_at));

  // Fetch exercise library for the add-exercise dropdown
  const allLibExercises = await db
    .select()
    .from(exerciseLibrary)
    .orderBy(asc(exerciseLibrary.muscle_group), asc(exerciseLibrary.name_ar));

  // Build nested structure
  const exByDay: Record<string, ExRow[]> = {};
  for (const row of allWE) {
    (exByDay[row.we.day_id] ??= []).push(row);
  }

  const daysByPlan: Record<string, DayFull[]> = {};
  for (const day of allDays) {
    (daysByPlan[day.plan_id] ??= []).push({ ...day, exercises: exByDay[day.id] ?? [] });
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

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">
              ← الصحة والرياضة
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">جدول التمارين</h1>
          </div>

          <WorkoutsClient
            initialPlans={plansWithDays}
            allLibExercises={allLibExercises}
          />

        </div>
      </main>
    </div>
  );
}
