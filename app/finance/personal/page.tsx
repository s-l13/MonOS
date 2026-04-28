import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { financeTransactions, financeIncomeSources } from "@/lib/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  createTransaction,
  createIncomeSource,
  toggleIncomeSource,
  deleteFinanceRecord,
} from "@/app/finance/actions";

const inputCls =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-gray-500 focus:outline-none";

const INCOME_CATS = [
  { value: "salary",     label: "راتب" },
  { value: "rent",       label: "إيجار" },
  { value: "investment", label: "استثمار" },
  { value: "freelance",  label: "عمل حر" },
  { value: "other",      label: "أخرى" },
] as const;

const TXN_CATS = [
  { value: "salary",    label: "راتب" },
  { value: "freelance", label: "عمل حر" },
  { value: "food",      label: "طعام" },
  { value: "transport", label: "مواصلات" },
  { value: "bills",     label: "فواتير" },
  { value: "other",     label: "أخرى" },
] as const;

type Props = {
  searchParams: Promise<{ tab?: string; type?: string; category?: string }>;
};

export default async function PersonalPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) return null;

  const { tab = "recurring", type: typeFilter, category: catFilter } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const [allTxns, filtered, incomeSources] = await Promise.all([
    db.select().from(financeTransactions)
      .where(eq(financeTransactions.user_id, userId)),
    db.select().from(financeTransactions)
      .where(
        and(
          eq(financeTransactions.user_id, userId),
          typeFilter ? eq(financeTransactions.type, typeFilter)     : undefined,
          catFilter  ? eq(financeTransactions.category, catFilter)  : undefined,
        ),
      )
      .orderBy(desc(financeTransactions.date)),
    db.select().from(financeIncomeSources)
      .where(eq(financeIncomeSources.user_id, userId))
      .orderBy(asc(financeIncomeSources.name)),
  ]);

  // Transaction stats
  const totalIncomeSAR  = txnSum(allTxns, "income",  "SAR");
  const totalExpenseSAR = txnSum(allTxns, "expense", "SAR");
  const totalIncomeUSD  = txnSum(allTxns, "income",  "USD");
  const totalExpenseUSD = txnSum(allTxns, "expense", "USD");
  const hasUSD = totalIncomeUSD > 0 || totalExpenseUSD > 0;

  // Monthly recurring income (SAR only)
  const monthlyRecurringSAR = incomeSources
    .filter((s) => s.is_active && s.currency === "SAR")
    .reduce((sum, s) => {
      const amt = parseFloat(s.amount);
      switch (s.frequency) {
        case "monthly":     return sum + amt;
        case "weekly":      return sum + amt * 4;
        case "yearly":      return sum + amt / 12;
        case "quarterly":   return sum + amt / 3;
        default:            return sum;
      }
    }, 0);

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition ${
      active
        ? "bg-gray-700 text-gray-100"
        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
    }`;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-5xl">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">المعاملات الشخصية</h1>
            <p className="mt-1 text-gray-400">دخل متكرر — معاملات يدوية</p>
          </div>

          {/* Tab nav */}
          <div className="mb-6 flex gap-2">
            <a href="/finance/personal?tab=recurring"    className={tabCls(tab === "recurring")}>
              دخل متكرر
            </a>
            <a href="/finance/personal?tab=transactions" className={tabCls(tab === "transactions")}>
              دخل ومصاريف
            </a>
          </div>

          {/* ===== TAB: RECURRING INCOME ===== */}
          {tab === "recurring" && (
            <>
              {/* Monthly total card */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                  <p className="text-xs text-gray-500">الدخل الشهري المتكرر (ر.س)</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-green-400">
                    {fmt(monthlyRecurringSAR, "SAR")}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">المصادر النشطة فقط</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                  <p className="text-xs text-gray-500">عدد المصادر</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gray-100">
                    {incomeSources.filter((s) => s.is_active).length}
                    <span className="text-base font-normal text-gray-500">
                      {" "}من {incomeSources.length}
                    </span>
                  </p>
                </div>
              </div>

              {/* Income sources list */}
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-gray-400">مصادر الدخل</h2>
                <Card>
                  {incomeSources.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-600">لا توجد مصادر دخل.</p>
                  ) : (
                    <ul className="divide-y divide-gray-800">
                      {incomeSources.map((s) => (
                        <li key={s.id} className={`flex flex-wrap items-center gap-3 py-3 ${!s.is_active ? "opacity-50" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-200 text-sm">{s.name}</span>
                              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                                {translateCat(s.category)}
                              </span>
                              <span className="text-xs text-gray-500">{translateFreq(s.frequency)}</span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>التالي: {s.next_date}</span>
                              {s.notes && <span>{s.notes}</span>}
                            </div>
                          </div>
                          <span className={`tabular-nums text-sm font-semibold ${s.is_active ? "text-green-400" : "text-gray-500"}`}>
                            {fmt(parseFloat(s.amount), s.currency)}
                          </span>
                          {/* Toggle active */}
                          <form action={toggleIncomeSource}>
                            <input type="hidden" name="id"        value={s.id} />
                            <input type="hidden" name="is_active" value={String(s.is_active)} />
                            <button
                              type="submit"
                              className={`rounded px-2 py-1 text-xs transition ${
                                s.is_active
                                  ? "text-yellow-500 hover:bg-yellow-950"
                                  : "text-green-500 hover:bg-green-950"
                              }`}
                            >
                              {s.is_active ? "إيقاف" : "تفعيل"}
                            </button>
                          </form>
                          {/* Delete */}
                          <form action={deleteFinanceRecord}>
                            <input type="hidden" name="table" value="finance_income_sources" />
                            <input type="hidden" name="id"    value={s.id} />
                            <button type="submit" className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-950">
                              حذف
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>

              {/* Add income source form */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-400">إضافة مصدر دخل</h2>
                <Card>
                  <form action={createIncomeSource} className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">الاسم *</label>
                      <input type="text" name="name" required placeholder="مثال: راتب شهري" className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">الفئة *</label>
                      <select name="category" required className={inputCls}>
                        {INCOME_CATS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">المبلغ *</label>
                      <input
                        type="number" name="amount" step="0.01" min="0.01" required
                        placeholder="0.00" className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">العملة</label>
                      <select name="currency" className={inputCls}>
                        <option value="SAR">ريال سعودي (ر.س)</option>
                        <option value="USD">دولار ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">التكرار *</label>
                      <select name="frequency" required className={inputCls}>
                        <option value="monthly">شهري</option>
                        <option value="weekly">أسبوعي</option>
                        <option value="yearly">سنوي</option>
                        <option value="quarterly">ربع سنوي</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">تاريخ البداية *</label>
                      <input type="date" name="start_date" defaultValue={today} required className={inputCls} />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="mb-1 block text-xs text-gray-500">ملاحظات</label>
                      <input type="text" name="notes" placeholder="اختياري" className={inputCls} />
                    </div>
                    <div className="col-span-2 pt-1 md:col-span-3">
                      <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                      >
                        إضافة مصدر
                      </button>
                    </div>
                  </form>
                </Card>
              </section>
            </>
          )}

          {/* ===== TAB: TRANSACTIONS ===== */}
          {tab === "transactions" && (
            <>
              {/* Stats */}
              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="إجمالي الدخل"   value={fmt(totalIncomeSAR,  "SAR")} color="green" />
                <StatCard label="إجمالي المصروف" value={fmt(totalExpenseSAR, "SAR")} color="red"   />
                <StatCard
                  label="الصافي ر.س"
                  value={fmt(totalIncomeSAR - totalExpenseSAR, "SAR")}
                  color={totalIncomeSAR >= totalExpenseSAR ? "green" : "red"}
                />
                {hasUSD && (
                  <StatCard label="الصافي $" value={fmt(totalIncomeUSD - totalExpenseUSD, "USD")} color="blue" />
                )}
              </div>

              {/* Filter */}
              <Card className="mb-4">
                <form method="GET" className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="tab" value="transactions" />
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">النوع</label>
                    <select name="type" defaultValue={typeFilter ?? ""} className={inputCls + " w-auto"}>
                      <option value="">الكل</option>
                      <option value="income">دخل</option>
                      <option value="expense">مصروف</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">الفئة</label>
                    <select name="category" defaultValue={catFilter ?? ""} className={inputCls + " w-auto"}>
                      <option value="">الكل</option>
                      {TXN_CATS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-600"
                  >
                    تصفية
                  </button>
                  {(typeFilter || catFilter) && (
                    <a
                      href="/finance/personal?tab=transactions"
                      className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-300"
                    >
                      مسح
                    </a>
                  )}
                </form>
              </Card>

              {/* Transactions table */}
              <Card className="mb-6">
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">لا توجد معاملات مطابقة.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-right text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-xs text-gray-500">
                          <th className="px-3 py-3">التاريخ</th>
                          <th className="px-3 py-3">النوع</th>
                          <th className="px-3 py-3">الفئة</th>
                          <th className="px-3 py-3">الوصف</th>
                          <th className="px-3 py-3 text-left">المبلغ</th>
                          <th className="px-3 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((t) => (
                          <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                            <td className="px-3 py-3 text-gray-400">{t.date}</td>
                            <td className="px-3 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                t.type === "income"
                                  ? "bg-green-950 text-green-400"
                                  : "bg-red-950 text-red-400"
                              }`}>
                                {t.type === "income" ? "دخل" : "مصروف"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-gray-300">{translateCat(t.category)}</td>
                            <td className="px-3 py-3 max-w-xs truncate text-gray-400">
                              {t.description ?? "—"}
                            </td>
                            <td className={`px-3 py-3 text-left font-semibold tabular-nums ${
                              t.type === "income" ? "text-green-400" : "text-red-400"
                            }`}>
                              {t.type === "income" ? "+" : "−"}{fmt(parseFloat(t.amount), t.currency)}
                            </td>
                            <td className="px-3 py-3">
                              <form action={deleteFinanceRecord}>
                                <input type="hidden" name="table" value="finance_transactions" />
                                <input type="hidden" name="id"    value={t.id} />
                                <button
                                  type="submit"
                                  className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-950"
                                >
                                  حذف
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Add transaction form */}
              <Card>
                <h2 className="mb-4 text-sm font-semibold text-gray-400">إضافة معاملة جديدة</h2>
                <form action={createTransaction} className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">النوع *</label>
                    <select name="type" required className={inputCls}>
                      <option value="income">دخل</option>
                      <option value="expense">مصروف</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">الفئة *</label>
                    <select name="category" required className={inputCls}>
                      {TXN_CATS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">المبلغ *</label>
                    <input
                      type="number" name="amount" step="0.01" min="0.01" required
                      placeholder="0.00" className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">العملة</label>
                    <select name="currency" className={inputCls}>
                      <option value="SAR">ريال سعودي (ر.س)</option>
                      <option value="USD">دولار ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">التاريخ *</label>
                    <input type="date" name="date" defaultValue={today} required className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">الوصف</label>
                    <input type="text" name="description" placeholder="اختياري" className={inputCls} />
                  </div>
                  <div className="col-span-2 pt-1 md:col-span-3">
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      إضافة
                    </button>
                  </div>
                </form>
              </Card>
            </>
          )}

        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const cls: Record<string, string> = {
    green: "text-green-400", red: "text-red-400",
    blue:  "text-blue-400",  default: "text-gray-100",
  };
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${cls[color] ?? "text-gray-100"}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function txnSum(
  txns: { type: string; currency: string; amount: string }[],
  type: string,
  currency: string,
): number {
  return txns
    .filter((t) => t.type === type && t.currency === currency)
    .reduce((s, t) => s + parseFloat(t.amount), 0);
}

function fmt(n: number, currency: string): string {
  const abs = Math.abs(n).toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === "SAR" ? `${abs} ر.س` : `$${abs}`;
}

function translateCat(cat: string): string {
  const map: Record<string, string> = {
    salary: "راتب", freelance: "عمل حر", food: "طعام",
    transport: "مواصلات", bills: "فواتير", other: "أخرى",
    rent: "إيجار", investment: "استثمار",
  };
  return map[cat] ?? cat;
}

function translateFreq(freq: string): string {
  const map: Record<string, string> = {
    monthly: "شهري", weekly: "أسبوعي", yearly: "سنوي", quarterly: "ربع سنوي",
  };
  return map[freq] ?? freq;
}
