import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ------------------------------------------------------------------
// profiles
// id is Clerk's user ID (format: user_xxx) — NOT a UUID
// ------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  id:              text("id").primaryKey(),
  email:           text("email"),
  role:            text("role").notNull().default("user"),
  approval_status: text("approval_status").notNull().default("pending"),
  prices_banned:   boolean("prices_banned").notNull().default(false),
  created_at:      timestamp("created_at", { withTimezone: true })
                     .notNull()
                     .default(sql`now()`),
  approved_at:     timestamp("approved_at", { withTimezone: true }),
});

// ------------------------------------------------------------------
// entities
// ------------------------------------------------------------------
export const entities = pgTable("entities", {
  id:          uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:     text("user_id").notNull(),
  name:        text("name").notNull(),
  entity_type: text("entity_type").notNull().default("sole"),
  status:      text("status").notNull().default("active"),
  description: text("description"),
  created_at:  timestamp("created_at", { withTimezone: true })
                 .notNull()
                 .default(sql`now()`),
});

// ------------------------------------------------------------------
// projects
// ------------------------------------------------------------------
export const projects = pgTable("projects", {
  id:               uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:          text("user_id").notNull(),
  name:             text("name").notNull(),
  entity_id:        uuid("entity_id").references(() => entities.id),
  ownership_type:   text("ownership_type").notNull().default("sole"),
  capital_amount:   numeric("capital_amount"),
  status:           text("status").notNull().default("planning"),
  progress_percent: integer("progress_percent").default(0),
  start_date:       date("start_date"),
  description:      text("description"),
  notes:            text("notes"),
  created_at:       timestamp("created_at", { withTimezone: true })
                      .notNull()
                      .default(sql`now()`),
});

// ------------------------------------------------------------------
// tasks
// ------------------------------------------------------------------
export const tasks = pgTable("tasks", {
  id:               uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:          text("user_id").notNull(),
  title:            text("title").notNull(),
  task_type:        text("task_type").notNull().default("personal"),
  context_label:    text("context_label"),
  entity_id:        uuid("entity_id").references(() => entities.id),
  project_id:       uuid("project_id").references(() => projects.id),
  description:      text("description"),
  priority:         text("priority").notNull().default("medium"),
  status:           text("status").notNull().default("new"),
  progress_percent: integer("progress_percent").default(0),
  start_date:       date("start_date"),
  due_date:         date("due_date"),
  due_time:         text("due_time"),
  is_all_day:       boolean("is_all_day").default(true),
  recurrence_rule:  text("recurrence_rule"),
  sync_to_calendar: boolean("sync_to_calendar").default(false),
  remind_one_week:  boolean("remind_one_week").default(true),
  remind_one_day:   boolean("remind_one_day").default(true),
  notes:            text("notes"),
  created_at:       timestamp("created_at", { withTimezone: true })
                      .notNull()
                      .default(sql`now()`),
});

// ------------------------------------------------------------------
// task_subtasks
// ------------------------------------------------------------------
export const taskSubtasks = pgTable("task_subtasks", {
  id:           uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:      text("user_id").notNull(),
  task_id:      uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title:        text("title").notNull(),
  is_completed: boolean("is_completed").notNull().default(false),
  created_at:   timestamp("created_at", { withTimezone: true })
                  .notNull()
                  .default(sql`now()`),
});

// ------------------------------------------------------------------
// partners
// ------------------------------------------------------------------
export const partners = pgTable("partners", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:    text("user_id").notNull(),
  name:       text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
                .notNull()
                .default(sql`now()`),
});

// ------------------------------------------------------------------
// task_assignments
// ------------------------------------------------------------------
export const taskAssignments = pgTable("task_assignments", {
  id:                uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  task_id:           uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  assigned_by:       text("assigned_by").notNull(),
  assigned_to:       text("assigned_to").notNull(),
  assigned_to_email: text("assigned_to_email").notNull(),
  comment:           text("comment"),
  status:            text("status").notNull().default("pending"),
  created_at:        timestamp("created_at", { withTimezone: true })
                       .notNull()
                       .default(sql`now()`),
});

// ------------------------------------------------------------------
// notifications
// ------------------------------------------------------------------
export const notifications = pgTable("notifications", {
  id:            uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:       text("user_id").notNull(),
  type:          text("type").notNull(),
  title:         text("title").notNull(),
  body:          text("body").notNull(),
  task_id:       uuid("task_id"),
  assignment_id: uuid("assignment_id"),
  is_read:       boolean("is_read").notNull().default(false),
  created_at:    timestamp("created_at", { withTimezone: true })
                   .notNull()
                   .default(sql`now()`),
});

// ------------------------------------------------------------------
// finance_transactions
// ------------------------------------------------------------------
export const financeTransactions = pgTable("finance_transactions", {
  id:          uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:     text("user_id").notNull(),
  type:        text("type").notNull(),
  category:    text("category").notNull(),
  amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency:    text("currency").notNull().default("SAR"),
  description: text("description"),
  date:        date("date").notNull(),
  project_id:  uuid("project_id").references(() => projects.id),
  created_at:  timestamp("created_at", { withTimezone: true })
                 .notNull()
                 .default(sql`now()`),
});

// ------------------------------------------------------------------
// finance_debts
// ------------------------------------------------------------------
export const financeDebts = pgTable("finance_debts", {
  id:               uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:          text("user_id").notNull(),
  direction:        text("direction").notNull(),
  person_name:      text("person_name").notNull(),
  amount:           numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency:         text("currency").notNull().default("SAR"),
  description:      text("description"),
  due_date:         date("due_date"),
  is_settled:       boolean("is_settled").notNull().default(false),
  settled_at:       timestamp("settled_at", { withTimezone: true }),
  debt_type:        text("debt_type").notNull().default("single_payment"),
  contact_id:       uuid("contact_id"),
  num_installments: integer("num_installments"),
  created_at:       timestamp("created_at", { withTimezone: true })
                      .notNull()
                      .default(sql`now()`),
});

// ------------------------------------------------------------------
// finance_recurring
// ------------------------------------------------------------------
export const financeRecurring = pgTable("finance_recurring", {
  id:            uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:       text("user_id").notNull(),
  name:          text("name").notNull(),
  type:          text("type").notNull(),
  amount:        numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency:      text("currency").notNull().default("SAR"),
  frequency:     text("frequency").notNull(),
  next_due_date: date("next_due_date").notNull(),
  is_active:     boolean("is_active").notNull().default(true),
  created_at:    timestamp("created_at", { withTimezone: true })
                   .notNull()
                   .default(sql`now()`),
});

// ------------------------------------------------------------------
// finance_project_entries
// ------------------------------------------------------------------
export const financeProjectEntries = pgTable("finance_project_entries", {
  id:          uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:     text("user_id").notNull(),
  project_id:  uuid("project_id").notNull().references(() => projects.id),
  type:        text("type").notNull(),
  amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency:    text("currency").notNull().default("SAR"),
  description: text("description"),
  date:        date("date").notNull(),
  created_at:  timestamp("created_at", { withTimezone: true })
                 .notNull()
                 .default(sql`now()`),
});

// ------------------------------------------------------------------
// finance_income_sources
// ------------------------------------------------------------------
export const financeIncomeSources = pgTable("finance_income_sources", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:    text("user_id").notNull(),
  name:       text("name").notNull(),
  category:   text("category").notNull(),
  amount:     numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency:   text("currency").notNull().default("SAR"),
  frequency:  text("frequency").notNull(),
  start_date: date("start_date").notNull(),
  next_date:  date("next_date").notNull(),
  is_active:  boolean("is_active").notNull().default(true),
  notes:      text("notes"),
  created_at: timestamp("created_at", { withTimezone: true })
                .notNull()
                .default(sql`now()`),
});

// ------------------------------------------------------------------
// finance_debt_contacts
// ------------------------------------------------------------------
export const financeDebtContacts = pgTable("finance_debt_contacts", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:    text("user_id").notNull(),
  name:       text("name").notNull(),
  phone:      text("phone"),
  notes:      text("notes"),
  created_at: timestamp("created_at", { withTimezone: true })
                .notNull()
                .default(sql`now()`),
});

// ------------------------------------------------------------------
// finance_debt_installments
// ------------------------------------------------------------------
export const financeDebtInstallments = pgTable("finance_debt_installments", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  debt_id:    uuid("debt_id").notNull().references(() => financeDebts.id, { onDelete: "cascade" }),
  amount:     numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency:   text("currency").notNull().default("SAR"),
  due_date:   date("due_date").notNull(),
  is_paid:    boolean("is_paid").notNull().default(false),
  paid_at:    timestamp("paid_at", { withTimezone: true }),
  notes:      text("notes"),
  created_at: timestamp("created_at", { withTimezone: true })
                .notNull()
                .default(sql`now()`),
});

// ------------------------------------------------------------------
// price_products
// ------------------------------------------------------------------
export const priceProducts = pgTable("price_products", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  created_by: text("created_by").notNull(),
  name:       text("name").notNull(),
  category:   text("category").notNull().default("other"),
  unit:       text("unit").notNull().default("piece"),
  notes:      text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ------------------------------------------------------------------
// price_entries
// ------------------------------------------------------------------
export const priceEntries = pgTable("price_entries", {
  id:            uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id:       text("user_id").notNull(),
  product_id:    uuid("product_id").notNull().references(() => priceProducts.id, { onDelete: "cascade" }),
  store_name:    text("store_name").notNull(),
  city:          text("city"),
  price:         numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity:      numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unit_price:    numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  purchase_date: date("purchase_date").notNull(),
  notes:         text("notes"),
  created_at:    timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type PriceProduct = typeof priceProducts.$inferSelect;
export type PriceEntry   = typeof priceEntries.$inferSelect;

// ------------------------------------------------------------------
// TypeScript row types inferred from schema
// ------------------------------------------------------------------
export type Profile                  = typeof profiles.$inferSelect;
export type Entity                   = typeof entities.$inferSelect;
export type Project                  = typeof projects.$inferSelect;
export type Task                     = typeof tasks.$inferSelect;
export type TaskSubtask              = typeof taskSubtasks.$inferSelect;
export type Partner                  = typeof partners.$inferSelect;
export type TaskAssignment           = typeof taskAssignments.$inferSelect;
export type Notification             = typeof notifications.$inferSelect;
export type FinanceTransaction       = typeof financeTransactions.$inferSelect;
export type FinanceDebt              = typeof financeDebts.$inferSelect;
export type FinanceRecurring         = typeof financeRecurring.$inferSelect;
export type FinanceProjectEntry      = typeof financeProjectEntries.$inferSelect;
export type FinanceIncomeSource      = typeof financeIncomeSources.$inferSelect;
export type FinanceDebtContact       = typeof financeDebtContacts.$inferSelect;
export type FinanceDebtInstallment   = typeof financeDebtInstallments.$inferSelect;
