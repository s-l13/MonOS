import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8");
const envVars = Object.fromEntries(
  envText.split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
    const idx = l.indexOf("=");
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
  }),
);

const sql = neon(envVars.DATABASE_URL);
console.log("Connected.");

try {
  await sql.query(`ALTER TABLE exercise_library ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system'`);
  console.log("✅ created_by added to exercise_library.");

  await sql.query(`ALTER TABLE exercise_library ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT true`);
  console.log("✅ is_system added to exercise_library.");

  await sql.query(`
    CREATE TABLE IF NOT EXISTS nutrition_plans (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT NOT NULL,
      day_name    TEXT NOT NULL,
      day_label   TEXT NOT NULL,
      is_rest_day BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  console.log("✅ nutrition_plans table created.");

  await sql.query(`
    CREATE TABLE IF NOT EXISTS nutrition_meals (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      plan_id     TEXT NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
      meal_name   TEXT NOT NULL,
      meal_time   TEXT,
      meal_order  INTEGER NOT NULL DEFAULT 0,
      ingredients TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  console.log("✅ nutrition_meals table created.");

} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
