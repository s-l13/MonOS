import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

const envText = readFileSync(envPath, "utf-8");
const envVars = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const DATABASE_URL = envVars.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
console.log("Connected to Neon database.");

const run = (stmt) => sql.query(stmt);

try {
  await run(`CREATE TABLE IF NOT EXISTS fitness_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    age INTEGER,
    gender TEXT,
    height NUMERIC(5,2),
    current_weight NUMERIC(5,2),
    target_weight NUMERIC(5,2),
    activity_level TEXT DEFAULT 'moderate',
    goal TEXT DEFAULT 'general_health',
    workout_days_per_week INTEGER DEFAULT 3,
    health_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`CREATE TABLE IF NOT EXISTS calorie_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    bmr NUMERIC(8,2),
    tdee NUMERIC(8,2),
    target_calories NUMERIC(8,2),
    protein_g NUMERIC(8,2),
    carbs_g NUMERIC(8,2),
    fat_g NUMERIC(8,2),
    goal TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`CREATE TABLE IF NOT EXISTS exercise_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    equipment TEXT,
    difficulty TEXT DEFAULT 'medium',
    image_url TEXT,
    video_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    goal TEXT,
    days_per_week INTEGER,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`CREATE TABLE IF NOT EXISTS workout_plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    day_name TEXT NOT NULL,
    day_label TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL REFERENCES workout_plan_days(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercise_library(id),
    sets INTEGER DEFAULT 3,
    reps INTEGER DEFAULT 10,
    weight NUMERIC(6,2),
    rest_seconds INTEGER DEFAULT 60,
    notes TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`CREATE TABLE IF NOT EXISTS workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    exercise_id UUID REFERENCES exercise_library(id),
    plan_id UUID REFERENCES workout_plans(id),
    sets_done INTEGER,
    reps_done INTEGER,
    weight_used NUMERIC(6,2),
    duration_minutes INTEGER,
    notes TEXT,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`CREATE TABLE IF NOT EXISTS weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    weight NUMERIC(5,2) NOT NULL,
    notes TEXT,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`CREATE TABLE IF NOT EXISTS cardio_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    cardio_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    intensity TEXT DEFAULT 'medium',
    calories_burned INTEGER,
    notes TEXT,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await run(`INSERT INTO exercise_library (name_ar, name_en, muscle_group, equipment, difficulty, description) VALUES
    ('بنش برس', 'Bench Press', 'chest', 'barbell', 'medium', 'تمرين أساسي لعضلة الصدر'),
    ('تمرين الضغط', 'Push Up', 'chest', 'bodyweight', 'easy', 'تمرين وزن الجسم للصدر'),
    ('سكوات', 'Squat', 'legs', 'barbell', 'medium', 'تمرين أساسي للأرجل'),
    ('ديدليفت', 'Deadlift', 'back', 'barbell', 'hard', 'تمرين مركب للظهر والأرجل'),
    ('لات بول داون', 'Lat Pulldown', 'back', 'machine', 'medium', 'تمرين لعضلة الظهر العريضة'),
    ('ضغط الكتف', 'Shoulder Press', 'shoulders', 'dumbbell', 'medium', 'تمرين لعضلة الكتف'),
    ('بايسبس كيرل', 'Biceps Curl', 'biceps', 'dumbbell', 'easy', 'تمرين لعضلة البايسبس'),
    ('ترايسبس بوش داون', 'Triceps Pushdown', 'triceps', 'cable', 'easy', 'تمرين لعضلة الترايسبس'),
    ('بلانك', 'Plank', 'core', 'bodyweight', 'medium', 'تمرين ثبات للكور'),
    ('جري', 'Running', 'cardio', 'none', 'medium', 'تمرين كارديو'),
    ('دراجة', 'Cycling', 'cardio', 'machine', 'easy', 'تمرين دراجة ثابتة')
  ON CONFLICT DO NOTHING`);

  console.log("✅ All fitness tables created and seeded successfully.\n");

  const tables = [
    "fitness_profiles",
    "calorie_calculations",
    "exercise_library",
    "workout_plans",
    "workout_plan_days",
    "workout_exercises",
    "workout_logs",
    "weight_logs",
    "cardio_logs",
  ];
  for (const t of tables) {
    const res = await run(`SELECT COUNT(*) as cnt FROM ${t}`);
    const cnt = res?.rows?.[0]?.cnt ?? res?.[0]?.cnt ?? "?";
    console.log(`  ${t}: ${cnt} rows`);
  }
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
