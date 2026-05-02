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
  await sql.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 15`);
  console.log("✅ tax_rate added to profiles.");

  await sql.query(`ALTER TABLE price_entries ADD COLUMN IF NOT EXISTS includes_tax BOOLEAN NOT NULL DEFAULT false`);
  console.log("✅ includes_tax added to price_entries.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
