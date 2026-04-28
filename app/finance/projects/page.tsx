import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, financeProjectEntries } from "@/lib/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { createProjectEntry, deleteFinanceRecord } from "@/app/finance/actions";

const inputCls =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-gray-500 focus:outline-none";

export default async function FinanceProjectsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const today = new Date().toISOString().slice(0, 10);

  const [projectList, allEntries] = await Promise.all([
    db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(asc(projects.name)),
    db.select({
      id:          financeProjectEntries.id,
      project_id:  financeProjectEntries.project_id,
      type:        financeProjectEntries.type,
      amount:      financeProjectEntries.amount,
      currency:    financeProjectEntries.currency,
      description: financeProjectEntries.description,
      date:        financeProjectEntries.date,
      projectName: projects.name,
    })
    .from(financeProjectEntries)
    .leftJoin(projects, eq(financeProjectEntries.project_id, projects.id))
    .where(eq(financeProjectEntries.user_id, userId))
    .orderBy(desc(financeProjectEntries.date)),
  ]);

  // Build summary per project
  const summaries = projectList.map((p) => {
    const entries = allEntries.filter((e) => e.project_id === p.id);
    const income     = entriesSum(entries, "income");
    const expense    = entriesSum(entries, "expense");
    const investment = entriesSum(entries, "investment");
    return { id: p.id, name: p.name, income, expense, investment, net: income - expense - investment, count: entries.length };
  });

  // Recent entries across all projects (last 10)
  const recentEntries = allEntries.slice(0, 10);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-5xl">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">المشاريع المالية</h1>
            <p className="mt-1 text-gray-400">الدخل والمصروفات والاستثمارات لكل مشروع</p>
          </div>

          {/* Projects summary table */}
          <Card className="mb-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-400">ملخص المشاريع (ر.س)</h2>
            {projectList.length === 0 ? (
              <p className="py-2 text-sm text-gray-600">لا توجد مشاريع. أضف مشروعاً أولاً من صفحة المشاريع.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-xs text-gray-500">
                      <th className="px-3 py-3">المشروع</th>
                      <th className="px-3 py-3 text-left">دخل</th>
                      <th className="px-3 py-3 text-left">مصروف</th>
                      <th className="px-3 py-3 text-left">استثمار</th>
                      <th className="px-3 py-3 text-left">الصافي</th>
                      <th className="px-3 py-3">معاملات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s) => (
                      <tr key={s.id} className="border-b border-gray-800">
                        <td className="px-3 py-3 font-medium text-gray-200">{s.name}</td>
                        <td className="px-3 py-3 text-left tabular-nums text-green-400">{fmt(s.income, "SAR")}</td>
                        <td className="px-3 py-3 text-left tabular-nums text-red-400">{fmt(s.expense, "SAR")}</td>
                        <td className="px-3 py-3 text-left tabular-nums text-blue-400">{fmt(s.investment, "SAR")}</td>
                        <td className={`px-3 py-3 text-left tabular-nums font-semibold ${
                          s.net >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {s.net >= 0 ? "+" : ""}{fmt(s.net, "SAR")}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-500">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Recent entries */}
          <Card className="mb-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-400">آخر المعاملات</h2>
            {recentEntries.length === 0 ? (
              <p className="py-2 text-sm text-gray-600">لا معاملات بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-xs text-gray-500">
                      <th className="px-3 py-3">المشروع</th>
                      <th className="px-3 py-3">النوع</th>
                      <th className="px-3 py-3">المبلغ</th>
                      <th className="px-3 py-3">الوصف</th>
                      <th className="px-3 py-3">التاريخ</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.map((e) => (
                      <tr key={e.id} className="border-b border-gray-800">
                        <td className="px-3 py-3 text-gray-300">{e.projectName ?? "—"}</td>
                        <td className="px-3 py-3">
                          <EntryTypeBadge type={e.type} />
                        </td>
                        <td className="px-3 py-3 tabular-nums font-semibold text-gray-200">
                          {fmt(parseFloat(e.amount), e.currency)}
                        </td>
                        <td className="px-3 py-3 max-w-xs truncate text-gray-400">{e.description ?? "—"}</td>
                        <td className="px-3 py-3 text-gray-400">{e.date}</td>
                        <td className="px-3 py-3">
                          <form action={deleteFinanceRecord}>
                            <input type="hidden" name="table" value="finance_project_entries" />
                            <input type="hidden" name="id"    value={e.id} />
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

          {/* Add entry form */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">إضافة قيد مالي لمشروع</h2>
            {projectList.length === 0 ? (
              <p className="text-sm text-gray-500">
                لا توجد مشاريع. <a href="/projects/new" className="text-blue-400 hover:underline">أضف مشروعاً أولاً</a>.
              </p>
            ) : (
              <form action={createProjectEntry} className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">المشروع *</label>
                  <select name="project_id" required className={inputCls}>
                    {projectList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">النوع *</label>
                  <select name="type" required className={inputCls}>
                    <option value="income">دخل</option>
                    <option value="expense">مصروف</option>
                    <option value="investment">استثمار</option>
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
            )}
          </Card>

        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EntryTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    income:     { label: "دخل",      cls: "bg-green-950 text-green-400"  },
    expense:    { label: "مصروف",    cls: "bg-red-950 text-red-400"      },
    investment: { label: "استثمار",  cls: "bg-blue-950 text-blue-400"    },
  };
  const { label, cls } = map[type] ?? { label: type, cls: "bg-gray-800 text-gray-400" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entriesSum(entries: { type: string; amount: string; currency: string }[], type: string): number {
  return entries
    .filter((e) => e.type === type && e.currency === "SAR")
    .reduce((s, e) => s + parseFloat(e.amount), 0);
}

function fmt(n: number, currency: string): string {
  const abs = Math.abs(n).toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === "SAR" ? `${abs} ر.س` : `$${abs}`;
}
