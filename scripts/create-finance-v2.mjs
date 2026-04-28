import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_UOD7QyC1THFu@ep-red-boat-ao1kooh3-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS finance_income_sources (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT          NOT NULL,
    name       TEXT          NOT NULL,
    category   TEXT          NOT NULL,
    amount     NUMERIC(12,2) NOT NULL,
    currency   TEXT          NOT NULL DEFAULT 'SAR',
    frequency  TEXT          NOT NULL,
    start_date DATE          NOT NULL,
    next_date  DATE          NOT NULL,
    is_active  BOOLEAN       NOT NULL DEFAULT true,
    notes      TEXT,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
  )
`;
console.log("✓ finance_income_sources created (or already exists)");

await sql`
  CREATE TABLE IF NOT EXISTS finance_debt_contacts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT        NOT NULL,
    name       TEXT        NOT NULL,
    phone      TEXT,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
console.log("✓ finance_debt_contacts created (or already exists)");

await sql`
  CREATE TABLE IF NOT EXISTS finance_debt_installments (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id    UUID          NOT NULL REFERENCES finance_debts(id) ON DELETE CASCADE,
    amount     NUMERIC(12,2) NOT NULL,
    currency   TEXT          NOT NULL DEFAULT 'SAR',
    due_date   DATE          NOT NULL,
    is_paid    BOOLEAN       NOT NULL DEFAULT false,
    paid_at    TIMESTAMPTZ,
    notes      TEXT,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
  )
`;
console.log("✓ finance_debt_installments created (or already exists)");

console.log("Done. All 3 finance v2 tables ready.");
