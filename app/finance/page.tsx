import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  financeTransactions,
  financeDebts,
  financeRecurring,
  financeDebtInstallments,
  financeIncomeSources,
} from "@/lib/schema";
import type { FinanceTransaction } from "@/lib/schema";
import { eq, and, desc, asc, gte, lte, count } from "drizzle-orm";
import MonthlyChart from "./MonthlyChart";
import type { ChartEntry } from "./MonthlyChart";
import Link from "next/link";

export default async function FinancePage() {
  const { userId } = await auth();
  if (!userId) return null;

  const now          = new Date();
  const today        = now.toISOString().slice(0, 10);
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const in30Days     = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
  const monthLabel   = now.toLocaleDateString("ar-SA", { month: "long", year: "numeric" });

  const [
    monthTxns,
    chartTxns,
    unsettledDebts,
    upcomingRecurring,
    incomeSources,
    recentTxns,
    installCountRows,
  ] = await Promise.all([
    // 1. This month transactions
    db.select().from(financeTransactions)
      .where(and(eq(financeTransactions.user_id, userId), gte(financeTransactions.date, monthStart))),
    // 2. Last 6 months for chart
    db.select().from(financeTransactions)
      .where(and(eq(financeTransactions.user_id, userId), gte(financeTransactions.date, sixMonthsAgo))),
    // 3. Unsettled debts
    db.select().from(financeDebts)
      .where(and(eq(financeDebts.user_id, userId), eq(financeDebts.is_settled, false))),
    // 4. Upcoming recurring — 30 days, limit 5
    db.select().from(financeRecurring)
      .where(and(
        eq(financeRecurring.user_id, userId),
        eq(financeRecurring.is_active, true),
        lte(financeRecurring.next_due_date, in30Days),
      ))
      .orderBy(asc(financeRecurring.next_due_date))
      .limit(5),
    // 5. Active income sources
    db.select().from(financeIncomeSources)
      .where(and(eq(financeIncomeSources.user_id, userId), eq(financeIncomeSources.is_active, true)))
      .orderBy(asc(financeIncomeSources.name)),
    // 6. Last 5 transactions
    db.select().from(financeTransactions)
      .where(eq(financeTransactions.user_id, userId))
      .orderBy(desc(financeTransactions.created_at))
      .limit(5),
    // 7. Unpaid installments count
    db.select({ unpaid: count() })
      .from(financeDebtInstallments)
      .innerJoin(financeDebts, eq(financeDebtInstallments.debt_id, financeDebts.id))
      .where(and(eq(financeDebts.user_id, userId), eq(financeDebtInstallments.is_paid, false))),
  ]);

  const unpaidCount = installCountRows[0]?.unpaid ?? 0;

  // Month metrics (SAR only — primary currency)
  const sarIncome  = txnSum(monthTxns, "income",  "SAR");
  const sarExpense = txnSum(monthTxns, "expense", "SAR");
  const sarNet     = sarIncome - sarExpense;

  // Debt totals
  const iOweSAR    = debtSum(unsettledDebts, "i_owe",    "SAR");
  const theyOweSAR = debtSum(unsettledDebts, "they_owe", "SAR");
  const netDebt    = theyOweSAR - iOweSAR;

  const chartData = buildChartData(chartTxns);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-100">لوحة المالية</h1>
            <p className="mt-1 text-gray-400">{monthLabel}</p>
          </div>

          {/* ROW 1 — 4 key metric cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              label="صافي الشهر الحالي"
              value={fmt(sarNet, "SAR")}
              sub={sarNet >= 0 ? "وضع إيجابي" : "مصاريف تتجاوز الدخل"}
              color={sarNet >= 0 ? "green" : "red"}
            />
            <MetricCard
              label="إجمالي الدخل هذا الشهر"
              value={fmt(sarIncome, "SAR")}
              sub={`${monthTxns.filter((t) => t.type === "income" && t.currency === "SAR").length} معاملة`}
              color="green"
            />
            <MetricCard
              label="إجمالي المصاريف هذا الشهر"
              value={fmt(sarExpense, "SAR")}
              sub={`${monthTxns.filter((t) => t.type === "expense" && t.currency === "SAR").length} معاملة`}
              color="red"
            />
            <MetricCard
              label="صافي الديون"
              value={fmt(Math.abs(netDebt), "SAR")}
              sub={netDebt >= 0 ? "لصالحك" : "عليك"}
              color={netDebt >= 0 ? "green" : "red"}
            />
          </div>

          {/* ROW 2 — Chart + Debt summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* 6-month bar chart */}
            <Card className="md:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-gray-400">
                مقارنة الدخل والمصاريف — آخر 6 أشهر (ر.س)
              </h2>
              <MonthlyChart data={chartData} />
            </Card>

            {/* Debt summary */}
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-gray-400">ملخص الديون</h2>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-gray-500">ما عليّ</dt>
                  <dd className="font-bold tabular-nums text-red-400">{fmt(iOweSAR, "SAR")}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-gray-500">ما لي</dt>
                  <dd className="font-bold tabular-nums text-green-400">{fmt(theyOweSAR, "SAR")}</dd>
                </div>
                <div className="border-t border-gray-800 pt-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-gray-500">الصافي</dt>
                    <dd className={`font-bold tabular-nums ${netDebt >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {netDebt >= 0 ? "+" : "−"}{fmt(Math.abs(netDebt), "SAR")}
                    </dd>
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-gray-500">أقساط متبقية</dt>
                    <dd className={`font-bold tabular-nums ${unpaidCount > 0 ? "text-yellow-400" : "text-gray-500"}`}>
                      {unpaidCount} قسط
                    </dd>
                  </div>
                </div>
              </dl>
              <Link
                href="/finance/debts"
                className="mt-5 block rounded-lg border border-gray-700 py-1.5 text-center text-xs text-gray-400 transition hover:border-gray-600 hover:text-gray-200"
              >
                إدارة الديون ←
              </Link>
            </Card>

          </div>

          {/* ROW 3 — Upcoming recurring + Active income sources */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Upcoming recurring payments */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400">المدفوعات الدورية القادمة</h2>
                <span className="text-xs text-gray-600">خلال 30 يوماً</span>
              </div>
              {upcomingRecurring.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-600">لا مدفوعات قادمة</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {upcomingRecurring.map((r) => {
                    const days = daysLeft(r.next_due_date, today);
                    const urgent = days <= 7;
                    return (
                      <li key={r.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-200">{r.name}</p>
                          <p className={`mt-0.5 text-xs ${urgent ? "text-red-400" : "text-gray-500"}`}>
                            {days === 0
                              ? "اليوم"
                              : days < 0
                                ? `متأخر ${Math.abs(days)} يوم`
                                : `بعد ${days} يوم`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-gray-100">
                            {fmt(parseFloat(r.amount), r.currency)}
                          </p>
                          <p className="text-xs text-gray-600">{r.next_due_date}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Active income sources */}
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-gray-400">مصادر الدخل المتكرر</h2>
              {incomeSources.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-600">لا مصادر دخل نشطة</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {incomeSources.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-200">{s.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{translateFreq(s.frequency)}</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-green-400">
                        {fmt(parseFloat(s.amount), s.currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

          </div>

          {/* ROW 4 — Last 5 transactions */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400">آخر المعاملات</h2>
              <Link
                href="/finance/personal?tab=transactions"
                className="text-xs text-gray-500 transition hover:text-gray-300"
              >
                عرض الكل →
              </Link>
            </div>
            {recentTxns.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-600">لا معاملات بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500">
                      <th className="pb-2 font-normal">التاريخ</th>
                      <th className="pb-2 font-normal">النوع</th>
                      <th className="pb-2 font-normal">الفئة</th>
                      <th className="pb-2 font-normal">الوصف</th>
                      <th className="pb-2 text-left font-normal">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTxns.map((t) => (
                      <tr key={t.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                        <td className="py-2.5 text-xs text-gray-500">{t.date}</td>
                        <td className="py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.type === "income"
                              ? "bg-green-950 text-green-400"
                              : "bg-red-950 text-red-400"
                          }`}>
                            {t.type === "income" ? "دخل" : "مصروف"}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-300">{translateCat(t.category)}</td>
                        <td className="max-w-xs truncate py-2.5 text-xs text-gray-500">
                          {t.description ?? "—"}
                        </td>
                        <td className={`py-2.5 text-left font-semibold tabular-nums ${
                          t.type === "income" ? "text-green-400" : "text-red-400"
                        }`}>
                          {t.type === "income" ? "+" : "−"}{fmt(parseFloat(t.amount), t.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ROW 5 — Quick navigation tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {NAV_TILES.map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className="group flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600 hover:bg-gray-800"
              >
                <tile.Icon />
                <div>
                  <p className="text-sm font-medium text-gray-200 transition group-hover:text-white">
                    {tile.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{tile.desc}</p>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation tiles config
// ---------------------------------------------------------------------------

const ICON_CLS = "h-5 w-5 text-gray-500 transition group-hover:text-gray-300";

const NAV_TILES = [
  {
    href:  "/finance/personal",
    label: "المالية الشخصية",
    desc:  "دخل ومصاريف يدوية",
    Icon:  () => (
      <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    href:  "/finance/debts",
    label: "الديون",
    desc:  "ما عليك وما لك",
    Icon:  () => (
      <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
      </svg>
    ),
  },
  {
    href:  "/finance/recurring",
    label: "المدفوعات الدورية",
    desc:  "اشتراكات والتزامات",
    Icon:  () => (
      <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    href:  "/finance/projects",
    label: "مالية المشاريع",
    desc:  "تتبع دخل المشاريع",
    Icon:  () => (
      <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    ),
  },
  {
    href:  "/finance/reports",
    label: "التقارير",
    desc:  "تحليلات وإحصائيات",
    Icon:  () => (
      <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    href:  "/finance/personal?tab=transactions",
    label: "إضافة معاملة",
    desc:  "تسجيل دخل أو مصروف",
    Icon:  () => (
      <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "green" | "red" | "default";
}) {
  const cls = { green: "text-green-400", red: "text-red-400", default: "text-gray-100" };
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums leading-tight ${cls[color]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-600">{sub}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function txnSum(txns: FinanceTransaction[], type: string, currency: string): number {
  return txns
    .filter((t) => t.type === type && t.currency === currency)
    .reduce((s, t) => s + parseFloat(t.amount), 0);
}

function debtSum(
  debts: { direction: string; currency: string; amount: string }[],
  direction: string,
  currency: string,
): number {
  return debts
    .filter((d) => d.direction === direction && d.currency === currency)
    .reduce((s, d) => s + parseFloat(d.amount), 0);
}

function fmt(amount: number, currency: string): string {
  const n = Math.abs(amount);
  const s = n.toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === "SAR" ? `${s} ر.س` : `$${s}`;
}

function daysLeft(dueDateStr: string, todayStr: string): number {
  const due   = new Date(dueDateStr).getTime();
  const today = new Date(todayStr).getTime();
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
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

function buildChartData(txns: FinanceTransaction[]): ChartEntry[] {
  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  const now = new Date();

  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();

    const slice = txns.filter((t) => {
      const [ty, tm] = t.date.split("-").map(Number);
      return ty === y && tm - 1 === m && t.currency === "SAR";
    });

    return {
      month:   arabicMonths[m],
      income:  slice.filter((t) => t.type === "income") .reduce((s, t) => s + parseFloat(t.amount), 0),
      expense: slice.filter((t) => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0),
    };
  });
}
