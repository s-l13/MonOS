import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { financeRecurring } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { createRecurring, toggleRecurring, deleteFinanceRecord } from "@/app/finance/actions";

const inputCls =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-gray-500 focus:outline-none";

const TYPES = [
  { value: "jamia",        label: "جمعية" },
  { value: "subscription", label: "اشتراك" },
  { value: "bill",         label: "فاتورة" },
  { value: "other",        label: "أخرى" },
] as const;

const FREQUENCIES = [
  { value: "weekly",  label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
  { value: "yearly",  label: "سنوي" },
] as const;

export default async function RecurringPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const items = await db
    .select()
    .from(financeRecurring)
    .where(eq(financeRecurring.user_id, userId))
    .orderBy(asc(financeRecurring.next_due_date));

  const today  = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const active   = items.filter((r) => r.is_active);
  const inactive = items.filter((r) => !r.is_active);

  const totalMonthly = active
    .filter((r) => r.currency === "SAR" && r.frequency === "monthly")
    .reduce((s, r) => s + parseFloat(r.amount), 0);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-4xl">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">المدفوعات الدورية</h1>
            <p className="mt-1 text-gray-400">
              {active.length} مدفوعة نشطة · إجمالي شهري {fmt(totalMonthly, "SAR")}
            </p>
          </div>

          {/* Active */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">النشطة</h2>
            <Card>
              {active.length === 0 ? (
                <p className="py-2 text-sm text-gray-600">لا مدفوعات نشطة.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-xs text-gray-500">
                        <th className="px-3 py-3">الاسم</th>
                        <th className="px-3 py-3">النوع</th>
                        <th className="px-3 py-3">المبلغ</th>
                        <th className="px-3 py-3">التكرار</th>
                        <th className="px-3 py-3">الاستحقاق التالي</th>
                        <th className="px-3 py-3">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.map((r) => {
                        const dueSoon = r.next_due_date <= in7Days;
                        const overdue = r.next_due_date < today;
                        return (
                          <tr
                            key={r.id}
                            className={`border-b border-gray-800 ${
                              overdue  ? "bg-red-950/10"    :
                              dueSoon  ? "bg-yellow-950/10" : ""
                            }`}
                          >
                            <td className="px-3 py-3 font-medium text-gray-200">{r.name}</td>
                            <td className="px-3 py-3">
                              <TypeBadge type={r.type} />
                            </td>
                            <td className="px-3 py-3 font-semibold tabular-nums text-gray-200">
                              {fmt(parseFloat(r.amount), r.currency)}
                            </td>
                            <td className="px-3 py-3 text-gray-400">{translateFreq(r.frequency)}</td>
                            <td className={`px-3 py-3 ${
                              overdue ? "font-medium text-red-400" :
                              dueSoon ? "font-medium text-yellow-400" :
                              "text-gray-400"
                            }`}>
                              {r.next_due_date}
                              {overdue  && <span className="mr-2 text-xs">(متأخر)</span>}
                              {!overdue && dueSoon && <span className="mr-2 text-xs">(قريباً)</span>}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex gap-2">
                                <form action={toggleRecurring}>
                                  <input type="hidden" name="id"        value={r.id} />
                                  <input type="hidden" name="is_active" value={String(r.is_active)} />
                                  <button
                                    type="submit"
                                    className="rounded px-2 py-1 text-xs text-gray-400 transition hover:bg-gray-700 hover:text-gray-200"
                                  >
                                    إيقاف
                                  </button>
                                </form>
                                <form action={deleteFinanceRecord}>
                                  <input type="hidden" name="table" value="finance_recurring" />
                                  <input type="hidden" name="id"    value={r.id} />
                                  <button
                                    type="submit"
                                    className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-950"
                                  >
                                    حذف
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>

          {/* Inactive */}
          {inactive.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-400">غير النشطة</h2>
              <Card>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-xs text-gray-500">
                        <th className="px-3 py-3">الاسم</th>
                        <th className="px-3 py-3">النوع</th>
                        <th className="px-3 py-3">المبلغ</th>
                        <th className="px-3 py-3">التكرار</th>
                        <th className="px-3 py-3">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inactive.map((r) => (
                        <tr key={r.id} className="border-b border-gray-800 opacity-50">
                          <td className="px-3 py-3 text-gray-400">{r.name}</td>
                          <td className="px-3 py-3"><TypeBadge type={r.type} /></td>
                          <td className="px-3 py-3 tabular-nums text-gray-400">
                            {fmt(parseFloat(r.amount), r.currency)}
                          </td>
                          <td className="px-3 py-3 text-gray-500">{translateFreq(r.frequency)}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-2">
                              <form action={toggleRecurring}>
                                <input type="hidden" name="id"        value={r.id} />
                                <input type="hidden" name="is_active" value={String(r.is_active)} />
                                <button
                                  type="submit"
                                  className="rounded px-2 py-1 text-xs text-green-500 transition hover:bg-green-950"
                                >
                                  تفعيل
                                </button>
                              </form>
                              <form action={deleteFinanceRecord}>
                                <input type="hidden" name="table" value="finance_recurring" />
                                <input type="hidden" name="id"    value={r.id} />
                                <button
                                  type="submit"
                                  className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-950"
                                >
                                  حذف
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}

          {/* Add form */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">إضافة مدفوعة دورية</h2>
            <form action={createRecurring} className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">الاسم *</label>
                <input type="text" name="name" required placeholder="مثال: نتفليكس، إيجار" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">النوع *</label>
                <select name="type" required className={inputCls}>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
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
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">الاستحقاق التالي *</label>
                <input type="date" name="next_due_date" required className={inputCls} />
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

        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    jamia:        { label: "جمعية",   cls: "bg-purple-950 text-purple-400" },
    subscription: { label: "اشتراك", cls: "bg-blue-950 text-blue-400"   },
    bill:         { label: "فاتورة", cls: "bg-orange-950 text-orange-400" },
    other:        { label: "أخرى",   cls: "bg-gray-800 text-gray-400"   },
  };
  const { label, cls } = map[type] ?? { label: type, cls: "bg-gray-800 text-gray-400" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function translateFreq(freq: string): string {
  const map: Record<string, string> = {
    weekly: "أسبوعي", monthly: "شهري", yearly: "سنوي",
  };
  return map[freq] ?? freq;
}

function fmt(n: number, currency: string): string {
  const abs = Math.abs(n).toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === "SAR" ? `${abs} ر.س` : `$${abs}`;
}
