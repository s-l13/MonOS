import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  financeDebts,
  financeDebtInstallments,
  financeDebtContacts,
} from "@/lib/schema";
import type { FinanceDebt, FinanceDebtContact } from "@/lib/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import {
  createDebt,
  settleDebt,
  createDebtContact,
  payInstallment,
  deleteFinanceRecord,
} from "@/app/finance/actions";

const inputCls =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-gray-500 focus:outline-none";

export default async function DebtsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const today = new Date().toISOString().slice(0, 10);

  const [unsettledDebts, settledDebts, contacts, installments] = await Promise.all([
    db.select().from(financeDebts)
      .where(and(eq(financeDebts.user_id, userId), eq(financeDebts.is_settled, false)))
      .orderBy(desc(financeDebts.created_at)),
    db.select().from(financeDebts)
      .where(and(eq(financeDebts.user_id, userId), eq(financeDebts.is_settled, true)))
      .orderBy(desc(financeDebts.created_at))
      .limit(10),
    db.select().from(financeDebtContacts)
      .where(eq(financeDebtContacts.user_id, userId))
      .orderBy(asc(financeDebtContacts.name)),
    db.select({
      id:       financeDebtInstallments.id,
      debt_id:  financeDebtInstallments.debt_id,
      amount:   financeDebtInstallments.amount,
      currency: financeDebtInstallments.currency,
      due_date: financeDebtInstallments.due_date,
      is_paid:  financeDebtInstallments.is_paid,
      paid_at:  financeDebtInstallments.paid_at,
    })
    .from(financeDebtInstallments)
    .innerJoin(financeDebts, eq(financeDebtInstallments.debt_id, financeDebts.id))
    .where(eq(financeDebts.user_id, userId))
    .orderBy(asc(financeDebtInstallments.due_date)),
  ]);

  // Build lookup maps
  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const installMap = new Map<string, typeof installments>();
  for (const inst of installments) {
    if (!installMap.has(inst.debt_id)) installMap.set(inst.debt_id, []);
    installMap.get(inst.debt_id)!.push(inst);
  }

  const iOweDebts    = unsettledDebts.filter((d) => d.direction === "i_owe");
  const theyOweDebts = unsettledDebts.filter((d) => d.direction === "they_owe");

  const iOweSAR    = debtSum(unsettledDebts, "i_owe",    "SAR");
  const iOweUSD    = debtSum(unsettledDebts, "i_owe",    "USD");
  const theyOweSAR = debtSum(unsettledDebts, "they_owe", "SAR");
  const theyOweUSD = debtSum(unsettledDebts, "they_owe", "USD");

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-4xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">الديون</h1>
            <p className="mt-1 text-gray-400">إدارة الديون — ما عليك وما لك</p>
          </div>

          {/* Section 1 — Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="إجمالي ما عليّ (ر.س)" value={fmt(iOweSAR,    "SAR")} color="red"   />
            <StatCard label="إجمالي ما لي (ر.س)"    value={fmt(theyOweSAR, "SAR")} color="green" />
            {iOweUSD > 0 && (
              <StatCard label="إجمالي ما عليّ ($)" value={fmt(iOweUSD,    "USD")} color="red"   />
            )}
            {theyOweUSD > 0 && (
              <StatCard label="إجمالي ما لي ($)"   value={fmt(theyOweUSD, "USD")} color="green" />
            )}
          </div>

          {/* Section 2 — Contacts */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">جهات الاتصال</h2>
            <Card>
              {contacts.length > 0 && (
                <ul className="mb-4 divide-y divide-gray-800">
                  {contacts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-medium text-gray-200">{c.name}</span>
                        {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
                        {c.notes && <span className="text-xs text-gray-600">{c.notes}</span>}
                      </div>
                      <form action={deleteFinanceRecord}>
                        <input type="hidden" name="table" value="finance_debt_contacts" />
                        <input type="hidden" name="id"    value={c.id} />
                        <button type="submit" className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-950">
                          حذف
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={createDebtContact} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">الاسم *</label>
                  <input type="text" name="name" required placeholder="اسم الشخص" className={inputCls + " w-40"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">الجوال</label>
                  <input type="tel" name="phone" placeholder="05xxxxxxxx" className={inputCls + " w-36"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">ملاحظات</label>
                  <input type="text" name="notes" placeholder="اختياري" className={inputCls + " w-44"} />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-600"
                >
                  إضافة جهة
                </button>
              </form>
            </Card>
          </section>

          {/* Section 3 — ديون عليّ */}
          <DebtSection
            title="ديون عليّ"
            debts={iOweDebts}
            today={today}
            contactMap={contactMap}
            installMap={installMap}
          />

          {/* Section 4 — ديون لي على الناس */}
          <DebtSection
            title="ديون لي على الناس"
            debts={theyOweDebts}
            today={today}
            contactMap={contactMap}
            installMap={installMap}
          />

          {/* Section 5 — الديون المسواة */}
          {settledDebts.length > 0 && (
            <section className="mb-6">
              <details>
                <summary className="mb-3 cursor-pointer select-none text-sm font-semibold text-gray-500 hover:text-gray-300">
                  الديون المسواة — آخر {settledDebts.length}
                </summary>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-right text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-xs text-gray-600">
                          <th className="px-3 py-2">الشخص</th>
                          <th className="px-3 py-2">الاتجاه</th>
                          <th className="px-3 py-2">المبلغ</th>
                          <th className="px-3 py-2">تاريخ التسوية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settledDebts.map((d) => (
                          <tr key={d.id} className="border-b border-gray-800/40 text-gray-500">
                            <td className="px-3 py-2">{d.person_name}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs ${
                                d.direction === "i_owe"
                                  ? "bg-red-950/30 text-red-600"
                                  : "bg-green-950/30 text-green-600"
                              }`}>
                                {d.direction === "i_owe" ? "كان عليّ" : "كان لي"}
                              </span>
                            </td>
                            <td className="px-3 py-2 tabular-nums">{fmt(parseFloat(d.amount), d.currency)}</td>
                            <td className="px-3 py-2 text-xs">
                              {d.settled_at
                                ? new Date(d.settled_at).toLocaleDateString("ar-SA")
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </details>
            </section>
          )}

          {/* Section 6 — Add debt form */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-400">إضافة دين جديد</h2>
            <Card>
              <form action={createDebt} className="grid grid-cols-2 gap-3 md:grid-cols-3">

                <div>
                  <label className="mb-1 block text-xs text-gray-500">الاتجاه *</label>
                  <select name="direction" required className={inputCls}>
                    <option value="i_owe">دين عليّ</option>
                    <option value="they_owe">دين لي</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">اسم الشخص *</label>
                  <input
                    type="text" name="person_name" required
                    placeholder="اسم الشخص" className={inputCls}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">المبلغ الكلي *</label>
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
                  <label className="mb-1 block text-xs text-gray-500">تاريخ الاستحقاق</label>
                  <input type="date" name="due_date" className={inputCls} />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">نوع السداد *</label>
                  <select name="debt_type" className={inputCls}>
                    <option value="single_payment">دفعة واحدة</option>
                    <option value="installments">أقساط</option>
                  </select>
                </div>

                <div className="col-span-2 md:col-span-3">
                  <label className="mb-1 block text-xs text-gray-500">الوصف</label>
                  <input type="text" name="description" placeholder="اختياري" className={inputCls} />
                </div>

                {/* Installment fields — always visible */}
                <div className="col-span-2 md:col-span-3 rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                  <p className="mb-3 text-xs text-gray-500">
                    تفاصيل الأقساط —{" "}
                    <span className="text-gray-600">اتركها فارغة إذا اخترت دفعة واحدة</span>
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">مبلغ القسط</label>
                      <input
                        type="number" name="installment_amount" step="0.01" min="0.01"
                        placeholder="0.00" className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">عدد الأقساط</label>
                      <input
                        type="number" name="num_installments" min="1" max="360"
                        placeholder="12" className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">تاريخ بداية الأقساط</label>
                      <input type="date" name="installment_start" className={inputCls} />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 pt-1 md:col-span-3">
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                  >
                    إضافة الدين
                  </button>
                </div>

              </form>
            </Card>
          </section>

        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DebtSection
// ---------------------------------------------------------------------------

type InstallRow = {
  id: string;
  debt_id: string;
  amount: string;
  currency: string;
  due_date: string;
  is_paid: boolean;
  paid_at: Date | null;
};

function DebtSection({
  title,
  debts,
  today,
  contactMap,
  installMap,
}: {
  title: string;
  debts: FinanceDebt[];
  today: string;
  contactMap: Map<string, FinanceDebtContact>;
  installMap: Map<string, InstallRow[]>;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-400">{title}</h2>
      <Card>
        {debts.length === 0 ? (
          <p className="py-2 text-sm text-gray-600">لا توجد ديون.</p>
        ) : (
          <div className="space-y-4">
            {debts.map((d) => {
              const contact   = d.contact_id ? contactMap.get(d.contact_id) : null;
              const insts     = installMap.get(d.id) ?? [];
              const paidCount = insts.filter((i) => i.is_paid).length;
              const overdue   = d.due_date !== null && d.due_date < today;

              return (
                <div
                  key={d.id}
                  className={`rounded-lg border p-4 ${
                    overdue
                      ? "border-red-900 bg-red-950/10"
                      : "border-gray-800"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`font-medium ${overdue ? "text-red-300" : "text-gray-100"}`}>
                        {d.person_name}
                      </p>
                      {contact?.phone && (
                        <p className="text-xs text-gray-500">{contact.phone}</p>
                      )}
                      {d.description && (
                        <p className="mt-0.5 text-xs text-gray-400">{d.description}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-gray-100">
                        {fmt(parseFloat(d.amount), d.currency)}
                      </p>
                      <p className={`text-xs ${overdue ? "text-red-400" : "text-gray-500"}`}>
                        {d.due_date
                          ? `${d.due_date}${overdue ? " — متأخر" : ""}`
                          : "بدون موعد"}
                      </p>
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {d.debt_type === "installments" ? (
                      <span className="rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-400">
                        {paidCount} من {d.num_installments ?? insts.length} قسط مدفوع
                      </span>
                    ) : overdue ? (
                      <span className="rounded-full bg-red-950 px-2 py-0.5 text-xs text-red-400">متأخر</span>
                    ) : (
                      <span className="rounded-full bg-yellow-950 px-2 py-0.5 text-xs text-yellow-400">معلّق</span>
                    )}

                    {/* Settle — single_payment only */}
                    {d.debt_type === "single_payment" && (
                      <form action={settleDebt}>
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-xs text-green-500 transition hover:bg-green-950"
                        >
                          تسوية كاملة
                        </button>
                      </form>
                    )}

                    {/* Delete */}
                    <form action={deleteFinanceRecord} className="mr-auto">
                      <input type="hidden" name="table" value="finance_debts" />
                      <input type="hidden" name="id"    value={d.id} />
                      <button
                        type="submit"
                        className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-950"
                      >
                        حذف
                      </button>
                    </form>
                  </div>

                  {/* Installments list */}
                  {d.debt_type === "installments" && insts.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300">
                        عرض الأقساط ({paidCount} من {insts.length} مدفوع)
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {insts.map((inst, idx) => {
                          const instOverdue = !inst.is_paid && inst.due_date < today;
                          return (
                            <li
                              key={inst.id}
                              className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${
                                inst.is_paid
                                  ? "text-gray-600"
                                  : instOverdue
                                    ? "bg-red-950/20 text-red-400"
                                    : "text-gray-400"
                              }`}
                            >
                              <span>قسط {idx + 1} — {inst.due_date}</span>
                              <div className="flex items-center gap-3">
                                <span className="tabular-nums">
                                  {fmt(parseFloat(inst.amount), inst.currency)}
                                </span>
                                {inst.is_paid ? (
                                  <span className="text-green-600">مدفوع</span>
                                ) : (
                                  <form action={payInstallment}>
                                    <input type="hidden" name="installment_id" value={inst.id} />
                                    <input type="hidden" name="debt_id"        value={d.id} />
                                    <button
                                      type="submit"
                                      className="rounded bg-green-950 px-2 py-0.5 text-green-400 hover:bg-green-900"
                                    >
                                      دفع
                                    </button>
                                  </form>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const cls: Record<string, string> = { green: "text-green-400", red: "text-red-400" };
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

function debtSum(
  debts: { direction: string; currency: string; amount: string }[],
  direction: string,
  currency: string,
): number {
  return debts
    .filter((d) => d.direction === direction && d.currency === currency)
    .reduce((s, d) => s + parseFloat(d.amount), 0);
}

function fmt(n: number, currency: string): string {
  const abs = Math.abs(n).toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === "SAR" ? `${abs} ر.س` : `$${abs}`;
}
