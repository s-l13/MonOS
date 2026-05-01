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
  await sql.query(`ALTER TABLE fitness_profiles ADD COLUMN IF NOT EXISTS nutrition_notes TEXT`);
  console.log("✅ nutrition_notes column added to fitness_profiles.");

  const res = await sql.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'fitness_profiles' ORDER BY ordinal_position`
  );
  console.log("fitness_profiles columns:", res.rows.map((r) => r.column_name).join(", "));
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
