"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fitnessProfiles,
  calorieCalculations,
  weightLogs,
  cardioLogs,
  workoutLogs,
  workoutPlans,
  workoutPlanDays,
  workoutExercises,
} from "@/lib/schema";

// ---------------------------------------------------------------------------
// Fitness Profile
// ---------------------------------------------------------------------------

export async function saveFitnessProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const age                   = parseInt(String(formData.get("age") || "")) || null;
  const gender                = String(formData.get("gender") || "").trim() || null;
  const height                = String(formData.get("height") || "").trim() || null;
  const current_weight        = String(formData.get("current_weight") || "").trim() || null;
  const target_weight         = String(formData.get("target_weight") || "").trim() || null;
  const activity_level        = String(formData.get("activity_level") || "moderate").trim();
  const goal                  = String(formData.get("goal") || "general_health").trim();
  const workout_days_per_week = parseInt(String(formData.get("workout_days_per_week") || "3")) || 3;
  const health_notes          = String(formData.get("health_notes") || "").trim() || null;

  await db
    .insert(fitnessProfiles)
    .values({ user_id: userId, age, gender, height, current_weight, target_weight, activity_level, goal, workout_days_per_week, health_notes, updated_at: new Date() })
    .onConflictDoUpdate({
      target: fitnessProfiles.user_id,
      set:    { age, gender, height, current_weight, target_weight, activity_level, goal, workout_days_per_week, health_notes, updated_at: new Date() },
    });

  revalidatePath("/fitness");
  revalidatePath("/fitness/profile");
  revalidatePath("/fitness/calories");
}

export async function saveNutritionNotes(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const nutrition_notes = String(formData.get("nutrition_notes") || "").trim() || null;

  await db
    .insert(fitnessProfiles)
    .values({ user_id: userId, nutrition_notes, updated_at: new Date() })
    .onConflictDoUpdate({
      target: fitnessProfiles.user_id,
      set:    { nutrition_notes, updated_at: new Date() },
    });

  revalidatePath("/fitness/nutrition");
}

// ---------------------------------------------------------------------------
// Calorie calculations
// ---------------------------------------------------------------------------

export async function saveCalorieCalc(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const bmr             = String(formData.get("bmr") || "").trim() || null;
  const tdee            = String(formData.get("tdee") || "").trim() || null;
  const target_calories = String(formData.get("target_calories") || "").trim() || null;
  const protein_g       = String(formData.get("protein_g") || "").trim() || null;
  const carbs_g         = String(formData.get("carbs_g") || "").trim() || null;
  const fat_g           = String(formData.get("fat_g") || "").trim() || null;
  const goal            = String(formData.get("goal") || "").trim() || null;

  await db.insert(calorieCalculations).values({ user_id: userId, bmr, tdee, target_calories, protein_g, carbs_g, fat_g, goal });

  revalidatePath("/fitness/calories");
}

// ---------------------------------------------------------------------------
// Weight logs
// ---------------------------------------------------------------------------

export async function addWeightLog(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const weight   = String(formData.get("weight") || "").trim();
  const log_date = String(formData.get("log_date") || "").trim();
  const notes    = String(formData.get("notes") || "").trim() || null;

  if (!weight || !log_date) return;

  await db.insert(weightLogs).values({ user_id: userId, weight, log_date, notes });

  revalidatePath("/fitness/progress");
  revalidatePath("/fitness");
}

export async function deleteWeightLog(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await db.delete(weightLogs).where(and(eq(weightLogs.id, id), eq(weightLogs.user_id, userId)));

  revalidatePath("/fitness/progress");
  revalidatePath("/fitness");
}

// ---------------------------------------------------------------------------
// Cardio logs
// ---------------------------------------------------------------------------

export async function addCardioLog(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const cardio_type      = String(formData.get("cardio_type") || "").trim();
  const duration_minutes = parseInt(String(formData.get("duration_minutes") || "0")) || 0;
  const intensity        = String(formData.get("intensity") || "medium").trim();
  const calories_burned  = parseInt(String(formData.get("calories_burned") || "")) || null;
  const log_date         = String(formData.get("log_date") || "").trim();
  const notes            = String(formData.get("notes") || "").trim() || null;

  if (!cardio_type || !duration_minutes || !log_date) return;

  await db.insert(cardioLogs).values({ user_id: userId, cardio_type, duration_minutes, intensity, calories_burned, log_date, notes });

  revalidatePath("/fitness/cardio");
  revalidatePath("/fitness");
}

export async function deleteCardioLog(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await db.delete(cardioLogs).where(and(eq(cardioLogs.id, id), eq(cardioLogs.user_id, userId)));

  revalidatePath("/fitness/cardio");
  revalidatePath("/fitness");
}

// ---------------------------------------------------------------------------
// Workout logs
// ---------------------------------------------------------------------------

export async function addWorkoutLog(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const exercise_id      = String(formData.get("exercise_id") || "").trim() || null;
  const plan_id          = String(formData.get("plan_id") || "").trim() || null;
  const sets_done        = parseInt(String(formData.get("sets_done") || "")) || null;
  const reps_done        = parseInt(String(formData.get("reps_done") || "")) || null;
  const weight_used      = String(formData.get("weight_used") || "").trim() || null;
  const duration_minutes = parseInt(String(formData.get("duration_minutes") || "")) || null;
  const notes            = String(formData.get("notes") || "").trim() || null;
  const log_date         = String(formData.get("log_date") || "").trim();

  if (!log_date) return;

  await db.insert(workoutLogs).values({ user_id: userId, exercise_id, plan_id, sets_done, reps_done, weight_used, duration_minutes, notes, log_date });

  revalidatePath("/fitness/workouts");
  revalidatePath("/fitness");
}

// ---------------------------------------------------------------------------
// Workout plans
// ---------------------------------------------------------------------------

export async function createWorkoutPlan(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const name          = String(formData.get("name") || "").trim();
  const goal          = String(formData.get("goal") || "").trim() || null;
  const days_per_week = parseInt(String(formData.get("days_per_week") || "3")) || 3;
  const start_date    = String(formData.get("start_date") || "").trim() || null;
  const end_date      = String(formData.get("end_date") || "").trim() || null;

  if (!name) return;

  await db.insert(workoutPlans).values({ user_id: userId, name, goal, days_per_week, start_date, end_date, is_active: true });

  revalidatePath("/fitness/workouts");
}

export async function updateWorkoutPlan(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id            = String(formData.get("id") || "").trim();
  const name          = String(formData.get("name") || "").trim();
  const goal          = String(formData.get("goal") || "").trim() || null;
  const days_per_week = parseInt(String(formData.get("days_per_week") || "3")) || 3;
  const start_date    = String(formData.get("start_date") || "").trim() || null;
  const end_date      = String(formData.get("end_date") || "").trim() || null;
  const is_active     = formData.get("is_active") !== "false";

  if (!id || !name) return;

  await db
    .update(workoutPlans)
    .set({ name, goal, days_per_week, start_date, end_date, is_active })
    .where(and(eq(workoutPlans.id, id), eq(workoutPlans.user_id, userId)));

  revalidatePath("/fitness/workouts");
}

export async function deleteWorkoutPlan(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await db.delete(workoutPlans).where(and(eq(workoutPlans.id, id), eq(workoutPlans.user_id, userId)));

  revalidatePath("/fitness/workouts");
}

// ---------------------------------------------------------------------------
// Plan days
// ---------------------------------------------------------------------------

export async function addPlanDay(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const plan_id   = String(formData.get("plan_id") || "").trim();
  const day_name  = String(formData.get("day_name") || "").trim();
  const day_label = String(formData.get("day_label") || "").trim() || null;

  if (!plan_id || !day_name) return;

  // Verify plan ownership
  const plan = await db.select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, plan_id), eq(workoutPlans.user_id, userId)))
    .limit(1);
  if (!plan[0]) return;

  // Use current day count as order_index
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(workoutPlanDays)
    .where(eq(workoutPlanDays.plan_id, plan_id));

  await db.insert(workoutPlanDays).values({ plan_id, day_name, day_label, order_index: cnt });

  revalidatePath("/fitness/workouts");
}

export async function updatePlanDay(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id        = String(formData.get("id") || "").trim();
  const day_name  = String(formData.get("day_name") || "").trim();
  const day_label = String(formData.get("day_label") || "").trim() || null;

  if (!id || !day_name) return;

  await db
    .update(workoutPlanDays)
    .set({ day_name, day_label })
    .where(eq(workoutPlanDays.id, id));

  revalidatePath("/fitness/workouts");
}

export async function deletePlanDay(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await db.delete(workoutPlanDays).where(eq(workoutPlanDays.id, id));

  revalidatePath("/fitness/workouts");
}

// ---------------------------------------------------------------------------
// Exercises within days
// ---------------------------------------------------------------------------

export async function addExerciseToDay(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const day_id      = String(formData.get("day_id") || "").trim();
  const exercise_id = String(formData.get("exercise_id") || "").trim();
  const sets        = parseInt(String(formData.get("sets") || "3")) || 3;
  const reps        = parseInt(String(formData.get("reps") || "10")) || 10;
  const weight      = String(formData.get("weight") || "").trim() || null;
  const rest_seconds = parseInt(String(formData.get("rest_seconds") || "60")) || 60;
  const notes       = String(formData.get("notes") || "").trim() || null;

  if (!day_id || !exercise_id) return;

  await db.insert(workoutExercises).values({ day_id, exercise_id, sets, reps, weight, rest_seconds, notes, is_completed: false });

  revalidatePath("/fitness/workouts");
}

export async function updateExerciseInDay(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id          = String(formData.get("id") || "").trim();
  const sets        = parseInt(String(formData.get("sets") || "3")) || 3;
  const reps        = parseInt(String(formData.get("reps") || "10")) || 10;
  const weight      = String(formData.get("weight") || "").trim() || null;
  const rest_seconds = parseInt(String(formData.get("rest_seconds") || "60")) || 60;
  const notes       = String(formData.get("notes") || "").trim() || null;

  if (!id) return;

  await db
    .update(workoutExercises)
    .set({ sets, reps, weight, rest_seconds, notes })
    .where(eq(workoutExercises.id, id));

  revalidatePath("/fitness/workouts");
}

export async function removeExerciseFromDay(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await db.delete(workoutExercises).where(eq(workoutExercises.id, id));

  revalidatePath("/fitness/workouts");
}

export async function toggleExerciseComplete(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id          = String(formData.get("id") || "").trim();
  const isCompleted = formData.get("is_completed") === "true";
  if (!id) return;

  await db
    .update(workoutExercises)
    .set({ is_completed: !isCompleted })
    .where(eq(workoutExercises.id, id));

  revalidatePath("/fitness/workouts");
}
