import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_UOD7QyC1THFu@ep-red-boat-ao1kooh3-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const OWNER_ID = "user_3CyhRBtCMtklWeN2NDWq4idepqZ";

const sql = neon(DATABASE_URL);

// entities
await sql`ALTER TABLE entities ADD COLUMN IF NOT EXISTS user_id TEXT`;
const e = await sql`UPDATE entities SET user_id = ${OWNER_ID} WHERE user_id IS NULL`;
await sql`ALTER TABLE entities ALTER COLUMN user_id SET NOT NULL`;
console.log(`✓ entities — user_id added, ${e.length ?? "?"} rows backfilled`);

// projects
await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id TEXT`;
const p = await sql`UPDATE projects SET user_id = ${OWNER_ID} WHERE user_id IS NULL`;
await sql`ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL`;
console.log(`✓ projects — user_id added, ${p.length ?? "?"} rows backfilled`);

// tasks
await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT`;
const t = await sql`UPDATE tasks SET user_id = ${OWNER_ID} WHERE user_id IS NULL`;
await sql`ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL`;
console.log(`✓ tasks — user_id added, ${t.length ?? "?"} rows backfilled`);

// partners
await sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id TEXT`;
const pa = await sql`UPDATE partners SET user_id = ${OWNER_ID} WHERE user_id IS NULL`;
await sql`ALTER TABLE partners ALTER COLUMN user_id SET NOT NULL`;
console.log(`✓ partners — user_id added, ${pa.length ?? "?"} rows backfilled`);

// task_subtasks
await sql`ALTER TABLE task_subtasks ADD COLUMN IF NOT EXISTS user_id TEXT`;
const ts = await sql`UPDATE task_subtasks SET user_id = ${OWNER_ID} WHERE user_id IS NULL`;
await sql`ALTER TABLE task_subtasks ALTER COLUMN user_id SET NOT NULL`;
console.log(`✓ task_subtasks — user_id added, ${ts.length ?? "?"} rows backfilled`);

console.log("\nMigration complete.");
