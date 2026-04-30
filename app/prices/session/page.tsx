import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { shoppingSessions, priceEntries, priceProducts } from "@/lib/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  createShoppingSession,
  endShoppingSession,
  addPriceEntryFromSession,
  addNewProductWithPrice,
  deletePriceEntry,
} from "../actions";

const UNITS: Record<string, string> = {
  piece: "قطعة",
  kg:    "كيلو",
  liter: "لتر",
  box:   "صندوق",
  pack:  "عبوة",
  meter: "متر",
};

const INPUT = "w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500";

export default async function ShoppingSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const { mode } = await searchParams;
  const activeTab = mode === "new" ? "new" : "existing";
  const today = new Date().toISOString().split("T")[0];

  const [activeSession] = await db
    .select()
    .from(shoppingSessions)
    .where(and(eq(shoppingSessions.user_id, userId), eq(shoppingSessions.is_active, true)))
    .orderBy(desc(shoppingSessions.created_at))
    .limit(1);

  const sessionEntries = activeSession
    ? await db
        .select({
          id:         priceEntries.id,
          product_id: priceEntries.product_id,
          price:      priceEntries.price,
          quantity:   priceEntries.quantity,
          unit_price: priceEntries.unit_price,
          name:       priceProducts.name,
          unit:       priceProducts.unit,
        })
        .from(priceEntries)
        .leftJoin(priceProducts, eq(priceEntries.product_id, priceProducts.id))
        .where(eq(priceEntries.session_id, activeSession.id))
        .orderBy(desc(priceEntries.created_at))
    : [];

  const allProducts = await db
    .select({ id: priceProducts.id, name: priceProducts.name, unit: priceProducts.unit })
    .from(priceProducts)
    .orderBy(asc(priceProducts.name));

  const pastSessions = await db
    .select()
    .from(shoppingSessions)
    .where(and(eq(shoppingSessions.user_id, userId), eq(shoppingSessions.is_active, false)))
    .orderBy(desc(shoppingSessions.session_date))
    .limit(10);

  const pastCounts = new Map<string, number>();
  for (const s of pastSessions) {
    const rows = await db
      .select({ id: priceEntries.id })
      .from(priceEntries)
      .where(eq(priceEntries.session_id, s.id));
    pastCounts.set(s.id, rows.length);
  }

  const runningTotal = sessionEntries.reduce((sum, e) => sum + Number(e.price), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8" dir="rtl">
      <Link
        href="/prices"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-6 transition"
      >
        ← مقارنة الأسعار
      </Link>

      <h1 className="text-2xl font-bold mb-1">جلسة التسوق</h1>
      <p className="text-gray-500 text-sm mb-8">سجّل أسعار متعددة من متجر واحد في جلسة واحدة</p>

      {!activeSession ? (
        /* ── No active session ── */
        <div className="max-w-md rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">بدء جلسة تسوق</h2>
          <form action={createShoppingSession} className="flex flex-col gap-3">
            <input name="store_name" required placeholder="اسم المتجر *" className={INPUT} />
            <input name="city" placeholder="المدينة (اختياري)" className={INPUT} />
            <div>
              <label className="text-xs text-gray-400 mb-1 block">التاريخ</label>
              <input name="session_date" type="date" defaultValue={today} required className={INPUT} />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
            >
              بدء الجلسة
            </button>
          </form>
        </div>
      ) : (
        /* ── Active session ── */
        <div className="flex flex-col gap-6 max-w-2xl">

          {/* Header card */}
          <div className="rounded-xl bg-gray-900 border border-green-700/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                  <span className="text-xs text-green-400 font-medium">جلسة نشطة</span>
                </div>
                <h2 className="text-xl font-bold">{activeSession.store_name}</h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  {activeSession.city && `${activeSession.city} · `}
                  {activeSession.session_date}
                </p>
              </div>
              <form action={endShoppingSession}>
                <input type="hidden" name="id" value={activeSession.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-red-900/50 hover:border-red-800 hover:text-red-300 transition"
                >
                  إنهاء الجلسة
                </button>
              </form>
            </div>
          </div>

          {/* Add product card with tabs */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-800">
              <Link
                href="?mode=existing"
                className={`flex-1 py-3 text-center text-sm font-medium transition ${
                  activeTab === "existing"
                    ? "bg-gray-800 text-white border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`}
              >
                منتج موجود
              </Link>
              <Link
                href="?mode=new"
                className={`flex-1 py-3 text-center text-sm font-medium transition ${
                  activeTab === "new"
                    ? "bg-gray-800 text-white border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`}
              >
                منتج جديد
              </Link>
            </div>

            <div className="p-5">
              {activeTab === "existing" ? (
                /* ── Tab A: existing product ── */
                <form action={addPriceEntryFromSession} className="flex flex-col gap-3">
                  <input type="hidden" name="session_id" value={activeSession.id} />
                  <select name="product_id" required className={INPUT}>
                    <option value="">اختر منتجاً *</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({UNITS[p.unit] ?? p.unit})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">السعر الكلي (ر.س) *</label>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        className={INPUT}
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-gray-400 mb-1 block">الكمية</label>
                      <input
                        name="quantity"
                        type="number"
                        step="0.01"
                        min="0.01"
                        defaultValue="1"
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
                  >
                    إضافة
                  </button>
                </form>
              ) : (
                /* ── Tab B: new product ── */
                <form action={addNewProductWithPrice} className="flex flex-col gap-3">
                  <input type="hidden" name="session_id" value={activeSession.id} />
                  <input
                    name="product_name"
                    required
                    placeholder="اسم المنتج *"
                    className={INPUT}
                  />
                  <div className="flex gap-3">
                    <select name="category" className={`flex-1 ${INPUT}`}>
                      <option value="food">مواد غذائية</option>
                      <option value="cleaning">تنظيف</option>
                      <option value="building">بناء</option>
                      <option value="electronics">إلكترونيات</option>
                      <option value="other">أخرى</option>
                    </select>
                    <select name="unit" className={`flex-1 ${INPUT}`}>
                      <option value="piece">قطعة</option>
                      <option value="kg">كيلو</option>
                      <option value="liter">لتر</option>
                      <option value="box">صندوق</option>
                      <option value="pack">عبوة</option>
                      <option value="meter">متر</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">السعر الكلي (ر.س) *</label>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        className={INPUT}
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-gray-400 mb-1 block">الكمية</label>
                      <input
                        name="quantity"
                        type="number"
                        step="0.01"
                        min="0.01"
                        defaultValue="1"
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
                  >
                    إضافة وحفظ المنتج
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Session items */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <h3 className="text-base font-semibold">
                منتجات هذه الجلسة
                {sessionEntries.length > 0 && (
                  <span className="text-gray-500 font-normal text-sm mr-2">
                    ({sessionEntries.length})
                  </span>
                )}
              </h3>
            </div>

            {sessionEntries.length === 0 ? (
              <p className="text-gray-600 text-sm px-5 py-8 text-center">
                لم تُضَف منتجات بعد
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs">
                        <th className="text-right py-2 px-4 font-medium">المنتج</th>
                        <th className="text-right py-2 px-4 font-medium">السعر الكلي</th>
                        <th className="text-right py-2 px-4 font-medium">الكمية</th>
                        <th className="text-right py-2 px-4 font-medium">سعر الوحدة</th>
                        <th className="py-2 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {sessionEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-gray-800/60 hover:bg-gray-800/30"
                        >
                          <td className="py-2.5 px-4 font-medium">
                            {entry.name ?? "—"}
                            <span className="text-gray-500 text-xs mr-1">
                              ({UNITS[entry.unit ?? ""] ?? entry.unit})
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-300">
                            {Number(entry.price).toFixed(2)} ر.س
                          </td>
                          <td className="py-2.5 px-4 text-gray-400">
                            {Number(entry.quantity).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-green-400 font-semibold">
                            {Number(entry.unit_price).toFixed(2)} ر.س
                          </td>
                          <td className="py-2.5 px-4 text-left">
                            <form action={deletePriceEntry}>
                              <input type="hidden" name="id" value={entry.id} />
                              <input type="hidden" name="product_id" value={entry.product_id} />
                              <button
                                type="submit"
                                className="text-red-500 hover:text-red-400 text-xs transition"
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
                <div className="flex items-center justify-between px-5 py-3 bg-gray-800/40 border-t border-gray-800">
                  <span className="text-sm text-gray-400">إجمالي الجلسة</span>
                  <span className="text-lg font-bold">{runningTotal.toFixed(2)} ر.س</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Past sessions */}
      {pastSessions.length > 0 && (
        <details className="mt-10 max-w-2xl group">
          <summary className="cursor-pointer list-none flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition select-none">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            الجلسات السابقة ({pastSessions.length})
          </summary>
          <div className="mt-3 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900 text-gray-400 text-xs">
                  <th className="text-right py-2 px-4 font-medium">المتجر</th>
                  <th className="text-right py-2 px-4 font-medium">المدينة</th>
                  <th className="text-right py-2 px-4 font-medium">التاريخ</th>
                  <th className="text-right py-2 px-4 font-medium">عدد الأسعار</th>
                </tr>
              </thead>
              <tbody>
                {pastSessions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-800/60 hover:bg-gray-900/40">
                    <td className="py-2 px-4 font-medium">{s.store_name}</td>
                    <td className="py-2 px-4 text-gray-400">{s.city ?? "—"}</td>
                    <td className="py-2 px-4 text-gray-400 text-xs whitespace-nowrap">{s.session_date}</td>
                    <td className="py-2 px-4 text-gray-300">{pastCounts.get(s.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
