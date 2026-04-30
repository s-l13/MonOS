import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_UOD7QyC1THFu@ep-red-boat-ao1kooh3-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

await sql`
  ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS prices_banned BOOLEAN NOT NULL DEFAULT false
`;
console.log("✓ prices_banned column added to profiles (or already exists)");
