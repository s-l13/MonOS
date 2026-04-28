import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_UOD7QyC1THFu@ep-red-boat-ao1kooh3-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS finance_transactions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT         NOT NULL,
    type        TEXT         NOT NULL,
    category    TEXT         NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    currency    TEXT         NOT NULL DEFAULT 'SAR',
    description TEXT,
    date        DATE         NOT NULL,
    project_id  UUID         REFERENCES projects(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
  )
`;
console.log("✓ finance_transactions created (or already exists)");

await sql`
  CREATE TABLE IF NOT EXISTS finance_debts (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT         NOT NULL,
    direction   TEXT         NOT NULL,
    person_name TEXT         NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    currency    TEXT         NOT NULL DEFAULT 'SAR',
    description TEXT,
    due_date    DATE,
    is_settled  BOOLEAN      NOT NULL DEFAULT false,
    settled_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
  )
`;
console.log("✓ finance_debts created (or already exists)");

await sql`
  CREATE TABLE IF NOT EXISTS finance_recurring (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT         NOT NULL,
    name          TEXT         NOT NULL,
    type          TEXT         NOT NULL,
    amount        NUMERIC(12,2) NOT NULL,
    currency      TEXT         NOT NULL DEFAULT 'SAR',
    frequency     TEXT         NOT NULL,
    next_due_date DATE         NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
  )
`;
console.log("✓ finance_recurring created (or already exists)");

await sql`
  CREATE TABLE IF NOT EXISTS finance_project_entries (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT         NOT NULL,
    project_id  UUID         NOT NULL REFERENCES projects(id),
    type        TEXT         NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    currency    TEXT         NOT NULL DEFAULT 'SAR',
    description TEXT,
    date        DATE         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
  )
`;
console.log("✓ finance_project_entries created (or already exists)");

console.log("Done. All 4 finance tables ready.");
