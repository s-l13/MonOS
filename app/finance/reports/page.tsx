import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  financeTransactions,
  financeDebts,
  financeProjectEntries,
  projects,
} from "@/lib/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import ReportsCharts from "../ReportsCharts";
import type { MonthlyEntry, CategoryEntry, ProjectEntry } from "../ReportsCharts";

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const now           = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);

  const [txns, allDebts, projectEntries] = await Promise.all([
    db.select()
      .from(financeTransactions)
      .where(
        and(
          eq(financeTransactions.user_id, userId),
          gte(financeTransactions.date, twelveMonthsAgo),
        ),
      )
      .orderBy(desc(financeTransactions.date)),
    db.select()
      .from(financeDebts)
      .where(eq(financeDebts.user_id, userId)),
    db.select({
      project_id:  financeProjectEntries.project_id,
      type:        financeProjectEntries.type,
      amount:      financeProjectEntries.amount,
      currency:    financeProjectEntries.currency,
      projectName: projects.name,
    })
    .from(financeProjectEntries)
    .leftJoin(projects, eq(financeProjectEntries.project_id, projects.id))
    .where(eq(financeProjectEntries.user_id, userId)),
  ]);

  // Monthly data (SAR, last 12 months)
  const arabicMonths = [
    "يناير","فبراير","مارس","أبريل","مايو","يونيو",
    "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
  ];

  const monthly: MonthlyEntry[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const slice = txns.filter((t) => {
      const [ty, tm] = t.date.split("-").map(Number);
      return ty === y && tm - 1 === m && t.currency === "SAR";
    });
    return {
      month:   arabicMonths[m],
      income:  slice.filter((t) => t.type === "income").reduce((s, t) => s + parseFloat(t.amount), 0),
      expense: slice.filter((t) => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0),
    };
  });

  // Category breakdown (all-time SAR expenses)
  const catLabels: Record<string, string> = {
    salary: "راتب", freelance: "عمل حر", food: "طعام",
    transport: "مواصلات", bills: "فواتير", other: "أخرى",
  };
  const catMap = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense" || t.currency !== "SAR") continue;
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + parseFloat(t.amount));
  }
  const categories: CategoryEntry[] = [...catMap.entries()]
    .map(([cat, value]) => ({ name: catLabels[cat] ?? cat, value }))
    .sort((a, b) => b.value - a.value);

  // Project comparison (SAR)
  const projMap = new Map<string, { name: string; income: number; expense: number; investment: number }>();
  for (const e of projectEntries) {
    if (e.currency !== "SAR") continue;
    if (!projMap.has(e.project_id)) {
      projMap.set(e.project_id, { name: e.projectName ?? "—", income: 0, expense: 0, investment: 0 });
    }
    const g = projMap.get(e.project_id)!;
    const amt = parseFloat(e.amount);
    if (e.type === "income")     g.income     += amt;
    if (e.type === "expense")    g.expense    += amt;
    if (e.type === "investment") g.investment += amt;
  }
  const projectsData: ProjectEntry[] = [...projMap.values()];

  // Debt summary stats
  const unsettled = allDebts.filter((d) => !d.is_settled);
  const settled   = allDebts.filter((d) =>  d.is_settled);

  const iOweSAR    = debtSum(unsettled, "i_owe",    "SAR");
  const theyOweSAR = debtSum(unsettled, "they_owe", "SAR");
  const iOweUSD    = debtSum(unsettled, "i_owe",    "USD");
  const theyOweUSD = debtSum(unsettled, "they_owe", "USD");

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-5xl">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">التقارير المالية</h1>
            <p className="mt-1 text-gray-400">تحليل شامل لوضعك المالي</p>
          </div>

          {/* Debt summary stats */}
          <Card className="mb-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-400">ملخص الديون</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="عليّ — ر.س"      value={fmt(iOweSAR,    "SAR")} color="red"    />
              <StatCard label="لي — ر.س"         value={fmt(theyOweSAR, "SAR")} color="green"  />
              {(iOweUSD > 0 || theyOweUSD > 0) && (
                <>
                  <StatCard label="عليّ — $" value={fmt(iOweUSD,    "USD")} color="red"   />
                  <StatCard label="لي — $"   value={fmt(theyOweUSD, "USD")} color="green" />
                </>
              )}
              <StatCard label="إجمالي الديون" value={String(allDebts.length)}        color="default" />
              <StatCard label="مسوّاة"         value={String(settled.length)}         color="default" />
              <StatCard label="غير مسوّاة"     value={String(unsettled.length)}       color="default" />
            </div>
          </Card>

          {/* Charts (client component) */}
          <ReportsCharts
            monthly={monthly}
            categories={categories}
            projects={projectsData}
          />

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
    green: "text-green-400", red: "text-red-400", default: "text-gray-100",
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

function debtSum(debts: { direction: string; currency: string; amount: string }[], direction: string, currency: string): number {
  return debts
    .filter((d) => d.direction === direction && d.currency === currency)
    .reduce((s, d) => s + parseFloat(d.amount), 0);
}

function fmt(n: number, currency: string): string {
  const abs = Math.abs(n).toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === "SAR" ? `${abs} ر.س` : `$${abs}`;
}
