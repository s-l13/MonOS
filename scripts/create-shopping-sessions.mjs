import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_UOD7QyC1THFu@ep-red-boat-ao1kooh3-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS shopping_sessions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      TEXT        NOT NULL,
    store_name   TEXT        NOT NULL,
    city         TEXT,
    session_date DATE        NOT NULL DEFAULT CURRENT_DATE,
    notes        TEXT,
    is_active    BOOLEAN     NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
console.log("✓ shopping_sessions created (or already exists)");

await sql`
  ALTER TABLE price_entries
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES shopping_sessions(id) ON DELETE SET NULL
`;
console.log("✓ session_id column added to price_entries (or already exists)");

console.log("Done.");
