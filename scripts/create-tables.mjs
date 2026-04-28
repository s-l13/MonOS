import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_UOD7QyC1THFu@ep-red-boat-ao1kooh3-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS task_assignments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assigned_by     TEXT        NOT NULL,
    assigned_to     TEXT        NOT NULL,
    assigned_to_email TEXT      NOT NULL,
    comment         TEXT,
    status          TEXT        NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
console.log("✓ task_assignments created (or already exists)");

await sql`
  CREATE TABLE IF NOT EXISTS notifications (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT        NOT NULL,
    type          TEXT        NOT NULL,
    title         TEXT        NOT NULL,
    body          TEXT        NOT NULL,
    task_id       UUID,
    assignment_id UUID,
    is_read       BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
console.log("✓ notifications created (or already exists)");

console.log("Done.");
