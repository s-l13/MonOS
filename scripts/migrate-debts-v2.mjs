import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_UOD7QyC1THFu@ep-red-boat-ao1kooh3-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

await sql`
  ALTER TABLE finance_debts
    ADD COLUMN IF NOT EXISTS debt_type TEXT NOT NULL DEFAULT 'single_payment'
`;
console.log("✓ finance_debts.debt_type added");

await sql`
  ALTER TABLE finance_debts
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES finance_debt_contacts(id)
`;
console.log("✓ finance_debts.contact_id added");

await sql`
  ALTER TABLE finance_debts
    ADD COLUMN IF NOT EXISTS num_installments INTEGER
`;
console.log("✓ finance_debts.num_installments added");

console.log("Done. finance_debts migration complete.");
