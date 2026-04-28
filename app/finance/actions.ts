"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  financeTransactions,
  financeDebts,
  financeRecurring,
  financeProjectEntries,
  financeIncomeSources,
  financeDebtContacts,
  financeDebtInstallments,
} from "@/lib/schema";

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
export async function createTransaction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const type        = String(formData.get("type")        || "").trim();
  const category    = String(formData.get("category")    || "").trim();
  const amount      = String(formData.get("amount")      || "").trim();
  const currency    = String(formData.get("currency")    || "SAR").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const date        = String(formData.get("date")        || "").trim();
  const project_id  = String(formData.get("project_id") || "").trim() || null;

  if (!type || !category || !amount || !date) return;

  await db.insert(financeTransactions).values({
    user_id: userId, type, category, amount, currency, description, date, project_id,
  });

  revalidatePath("/finance");
  revalidatePath("/finance/personal");
}

// ---------------------------------------------------------------------------
// Debts
// ---------------------------------------------------------------------------
export async function createDebt(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const direction          = String(formData.get("direction")          || "").trim();
  const person_name        = String(formData.get("person_name")        || "").trim();
  const amount             = String(formData.get("amount")             || "").trim();
  const currency           = String(formData.get("currency")           || "SAR").trim();
  const description        = String(formData.get("description")        || "").trim() || null;
  const due_date           = String(formData.get("due_date")           || "").trim() || null;
  const debt_type          = String(formData.get("debt_type")          || "single_payment").trim();
  const contact_id         = String(formData.get("contact_id")         || "").trim() || null;
  const installment_amount = String(formData.get("installment_amount") || "").trim();
  const num_installments   = parseInt(String(formData.get("num_installments") || "0")) || null;
  const installment_start  = String(formData.get("installment_start")  || "").trim();

  if (!direction || !person_name || !amount) return;

  const [debt] = await db
    .insert(financeDebts)
    .values({
      user_id: userId,
      direction,
      person_name,
      amount,
      currency,
      description,
      due_date,
      debt_type,
      contact_id,
      num_installments: debt_type === "installments" ? num_installments : null,
    })
    .returning();

  // Auto-generate installment rows
  if (debt_type === "installments" && installment_amount && num_installments && installment_start) {
    const rows = Array.from({ length: num_installments }, (_, i) => ({
      debt_id:  debt.id,
      amount:   installment_amount,
      currency,
      due_date: addMonths(installment_start, i),
    }));
    await db.insert(financeDebtInstallments).values(rows);
  }

  revalidatePath("/finance");
  revalidatePath("/finance/debts");
}

export async function settleDebt(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await db
    .update(financeDebts)
    .set({ is_settled: true, settled_at: new Date() })
    .where(and(eq(financeDebts.id, id), eq(financeDebts.user_id, userId)));

  revalidatePath("/finance");
  revalidatePath("/finance/debts");
}

export async function payInstallment(formData: FormData) {
  const installmentId = String(formData.get("installment_id") || "").trim();
  const debtId        = String(formData.get("debt_id")        || "").trim();
  if (!installmentId || !debtId) return;

  await db
    .update(financeDebtInstallments)
    .set({ is_paid: true, paid_at: new Date() })
    .where(eq(financeDebtInstallments.id, installmentId));

  // Auto-settle debt when all installments are paid
  const [{ remaining }] = await db
    .select({ remaining: count() })
    .from(financeDebtInstallments)
    .where(and(eq(financeDebtInstallments.debt_id, debtId), eq(financeDebtInstallments.is_paid, false)));

  if (remaining === 0) {
    await db
      .update(financeDebts)
      .set({ is_settled: true, settled_at: new Date() })
      .where(eq(financeDebts.id, debtId));
  }

  revalidatePath("/finance/debts");
  revalidatePath("/finance");
}

// ---------------------------------------------------------------------------
// Debt contacts
// ---------------------------------------------------------------------------
export async function createDebtContact(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const name  = String(formData.get("name")  || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name) return;

  await db.insert(financeDebtContacts).values({ user_id: userId, name, phone, notes });

  revalidatePath("/finance/debts");
}

// ---------------------------------------------------------------------------
// Income sources
// ---------------------------------------------------------------------------
export async function createIncomeSource(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const name       = String(formData.get("name")       || "").trim();
  const category   = String(formData.get("category")   || "").trim();
  const amount     = String(formData.get("amount")      || "").trim();
  const currency   = String(formData.get("currency")   || "SAR").trim();
  const frequency  = String(formData.get("frequency")  || "").trim();
  const start_date = String(formData.get("start_date") || "").trim();
  const notes      = String(formData.get("notes")      || "").trim() || null;

  if (!name || !category || !amount || !frequency || !start_date) return;

  await db.insert(financeIncomeSources).values({
    user_id: userId,
    name,
    category,
    amount,
    currency,
    frequency,
    start_date,
    next_date: start_date,
    notes,
  });

  revalidatePath("/finance");
  revalidatePath("/finance/personal");
}

export async function toggleIncomeSource(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id       = String(formData.get("id")        || "").trim();
  const isActive = formData.get("is_active") === "true";
  if (!id) return;

  await db
    .update(financeIncomeSources)
    .set({ is_active: !isActive })
    .where(and(eq(financeIncomeSources.id, id), eq(financeIncomeSources.user_id, userId)));

  revalidatePath("/finance");
  revalidatePath("/finance/personal");
}

// ---------------------------------------------------------------------------
// Recurring payments
// ---------------------------------------------------------------------------
export async function createRecurring(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const name          = String(formData.get("name")          || "").trim();
  const type          = String(formData.get("type")          || "").trim();
  const amount        = String(formData.get("amount")        || "").trim();
  const currency      = String(formData.get("currency")      || "SAR").trim();
  const frequency     = String(formData.get("frequency")     || "").trim();
  const next_due_date = String(formData.get("next_due_date") || "").trim();

  if (!name || !type || !amount || !frequency || !next_due_date) return;

  await db.insert(financeRecurring).values({
    user_id: userId, name, type, amount, currency, frequency, next_due_date,
  });

  revalidatePath("/finance");
  revalidatePath("/finance/recurring");
}

export async function toggleRecurring(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id       = String(formData.get("id")        || "").trim();
  const isActive = formData.get("is_active") === "true";
  if (!id) return;

  await db
    .update(financeRecurring)
    .set({ is_active: !isActive })
    .where(and(eq(financeRecurring.id, id), eq(financeRecurring.user_id, userId)));

  revalidatePath("/finance");
  revalidatePath("/finance/recurring");
}

// ---------------------------------------------------------------------------
// Project entries
// ---------------------------------------------------------------------------
export async function createProjectEntry(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const project_id  = String(formData.get("project_id")  || "").trim();
  const type        = String(formData.get("type")         || "").trim();
  const amount      = String(formData.get("amount")       || "").trim();
  const currency    = String(formData.get("currency")     || "SAR").trim();
  const description = String(formData.get("description")  || "").trim() || null;
  const date        = String(formData.get("date")         || "").trim();

  if (!project_id || !type || !amount || !date) return;

  await db.insert(financeProjectEntries).values({
    user_id: userId, project_id, type, amount, currency, description, date,
  });

  revalidatePath("/finance");
  revalidatePath("/finance/projects");
}

// ---------------------------------------------------------------------------
// Generic delete
// ---------------------------------------------------------------------------
export async function deleteFinanceRecord(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const table = String(formData.get("table") || "").trim();
  const id    = String(formData.get("id")    || "").trim();
  if (!table || !id) return;

  switch (table) {
    case "finance_transactions":
      await db.delete(financeTransactions)
        .where(and(eq(financeTransactions.id, id), eq(financeTransactions.user_id, userId)));
      revalidatePath("/finance/personal");
      break;
    case "finance_debts":
      await db.delete(financeDebts)
        .where(and(eq(financeDebts.id, id), eq(financeDebts.user_id, userId)));
      revalidatePath("/finance/debts");
      break;
    case "finance_recurring":
      await db.delete(financeRecurring)
        .where(and(eq(financeRecurring.id, id), eq(financeRecurring.user_id, userId)));
      revalidatePath("/finance/recurring");
      break;
    case "finance_project_entries":
      await db.delete(financeProjectEntries)
        .where(and(eq(financeProjectEntries.id, id), eq(financeProjectEntries.user_id, userId)));
      revalidatePath("/finance/projects");
      break;
    case "finance_income_sources":
      await db.delete(financeIncomeSources)
        .where(and(eq(financeIncomeSources.id, id), eq(financeIncomeSources.user_id, userId)));
      revalidatePath("/finance/personal");
      break;
    case "finance_debt_contacts":
      await db.delete(financeDebtContacts)
        .where(and(eq(financeDebtContacts.id, id), eq(financeDebtContacts.user_id, userId)));
      revalidatePath("/finance/debts");
      break;
    default:
      return;
  }

  revalidatePath("/finance");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-");
}
