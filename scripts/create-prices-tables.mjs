import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_UOD7QyC1THFu@ep-red-boat-ao1kooh3-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS price_products (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by TEXT        NOT NULL,
    name       TEXT        NOT NULL,
    category   TEXT        NOT NULL DEFAULT 'other',
    unit       TEXT        NOT NULL DEFAULT 'piece',
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
console.log("✓ price_products created (or already exists)");

await sql`
  CREATE TABLE IF NOT EXISTS price_entries (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT          NOT NULL,
    product_id    UUID          NOT NULL REFERENCES price_products(id) ON DELETE CASCADE,
    store_name    TEXT          NOT NULL,
    city          TEXT,
    price         NUMERIC(10,2) NOT NULL,
    quantity      NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price    NUMERIC(10,2) NOT NULL,
    purchase_date DATE          NOT NULL DEFAULT CURRENT_DATE,
    notes         TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
  )
`;
console.log("✓ price_entries created (or already exists)");

console.log("Done. Both price tables ready.");
