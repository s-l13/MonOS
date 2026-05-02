import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { priceProducts, priceEntries, profiles } from "@/lib/schema";
import { sql, eq, count } from "drizzle-orm";
import { createProduct } from "./actions";
import TaxSettings from "./TaxSettings";

const CATEGORIES: Record<string, string> = {
  food:        "مواد غذائية",
  cleaning:    "تنظيف",
  building:    "بناء",
  electronics: "إلكترونيات",
  other:       "أخرى",
};

const UNITS: Record<string, string> = {
  piece:  "قطعة",
  kg:     "كيلو",
  liter:  "لتر",
  box:    "صندوق",
  pack:   "عبوة",
  meter:  "متر",
};

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { userId } = await auth();
  const { q } = await searchParams;

  // Fetch user tax rate
  let taxRate = 15;
  if (userId) {
    const [prof] = await db
      .select({ tax_rate: profiles.tax_rate })
      .from(profiles)
      .where(eq(profiles.id, userId));
    if (prof?.tax_rate) taxRate = parseFloat(String(prof.tax_rate));
  }

  const allProducts = await db.select().from(priceProducts);

  const filtered = q
    ? allProducts.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    : allProducts;

  // Aggregate query: compute min/max/avg normalized to price WITHOUT tax
  const taxDiv = sql.raw(String(1 + taxRate / 100));

  const stats = await db
    .select({
      product_id:     priceEntries.product_id,
      // Normalized: if includes_tax, divide by (1 + rate); else use as-is
      min_pretax:     sql<string>`min(CASE WHEN ${priceEntries.includes_tax} THEN ${priceEntries.unit_price}::numeric / ${taxDiv} ELSE ${priceEntries.unit_price}::numeric END)`,
      max_pretax:     sql<string>`max(CASE WHEN ${priceEntries.includes_tax} THEN ${priceEntries.unit_price}::numeric / ${taxDiv} ELSE ${priceEntries.unit_price}::numeric END)`,
      avg_pretax:     sql<string>`avg(CASE WHEN ${priceEntries.includes_tax} THEN ${priceEntries.unit_price}::numeric / ${taxDiv} ELSE ${priceEntries.unit_price}::numeric END)`,
      total_entries:  sql<number>`count(*)::int`,
      contributors:   sql<number>`count(distinct ${priceEntries.user_id})::int`,
      // Store name of cheapest (by normalized price)
      min_store_name: sql<string>`(array_agg(${priceEntries.store_name} order by CASE WHEN ${priceEntries.includes_tax} THEN ${priceEntries.unit_price}::numeric / ${taxDiv} ELSE ${priceEntries.unit_price}::numeric END asc))[1]`,
      min_city:       sql<string>`(array_agg(${priceEntries.city} order by CASE WHEN ${priceEntries.includes_tax} THEN ${priceEntries.unit_price}::numeric / ${taxDiv} ELSE ${priceEntries.unit_price}::numeric END asc))[1]`,
    })
    .from(priceEntries)
    .groupBy(priceEntries.product_id);

  const statsMap = new Map(stats.map((s) => [s.product_id, s]));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8" dir="rtl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-6 transition"
      >
        ← الصفحة الرئيسية
      </Link>
      <h1 className="text-2xl font-bold mb-4">مقارنة الأسعار</h1>

      {/* Tax settings bar */}
      {userId && (
        <div className="mb-6">
          <TaxSettings taxRate={taxRate} />
        </div>
      )}

      {/* Shopping session CTA */}
      <div className="mb-8 rounded-xl border border-blue-800 bg-blue-950/30 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-blue-300">🛒 جلسة التسوق</h2>
            <p className="mt-1 text-sm text-gray-400">
              ابدأ جلسة تسوق لتسجيل أسعار منتجات متعددة من نفس المتجر دفعة واحدة — أدخل اسم المتجر مرة واحدة فقط ثم أضف جميع المنتجات وأسعارها بسرعة
            </p>
          </div>
          <Link
            href="/prices/session"
            className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-900/50"
          >
            بدء جلسة ←
          </Link>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="ابحث عن منتج..."
          className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
        >
          بحث
        </button>
        {q && (
          <Link
            href="/prices"
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600 transition"
          >
            مسح
          </Link>
        )}
      </form>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">لا توجد منتجات{q ? " تطابق البحث" : " بعد"}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {filtered.map((product) => {
            const s = statsMap.get(product.id);
            return (
              <div
                key={product.id}
                className="rounded-xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-gray-100 text-base">{product.name}</span>
                  <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                    {CATEGORIES[product.category] ?? product.category}
                  </span>
                  <span className="rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-400">
                    {UNITS[product.unit] ?? product.unit}
                  </span>
                </div>

                {s ? (
                  <div className="flex flex-col gap-1 text-sm">
                    {/* Cheapest — without tax */}
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span className="text-green-400 font-bold text-lg">
                        {Number(s.min_pretax).toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-xs">ر.س</span>
                      <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
                        بدون ضريبة
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      أرخص — {s.min_store_name}{s.min_city ? ` · ${s.min_city}` : ""}
                    </div>
                    {/* With tax */}
                    <div className="text-gray-500 text-xs">
                      مع ضريبة ({taxRate}%):{" "}
                      <span className="text-gray-400">
                        {(Number(s.min_pretax) * (1 + taxRate / 100)).toFixed(2)} ر.س
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-red-400 font-semibold text-sm">
                        {Number(s.max_pretax).toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-xs">ر.س أغلى</span>
                    </div>
                    <div className="text-gray-400 text-xs">
                      متوسط: <span className="text-gray-300">{Number(s.avg_pretax).toFixed(2)} ر.س</span>
                      <span className="text-gray-600 mr-1">(بدون ضريبة)</span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {s.total_entries} سجل من {s.contributors} مساهم
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">لا توجد أسعار بعد</p>
                )}

                <div className="flex gap-2 mt-auto pt-1">
                  <Link
                    href={`/prices/${product.id}`}
                    className="flex-1 text-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition"
                  >
                    عرض المقارنة
                  </Link>
                  <Link
                    href={`/prices/${product.id}#add`}
                    className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs hover:bg-gray-600 transition"
                  >
                    إضافة سعر
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add product form */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">إضافة منتج جديد</h2>
        <form action={createProduct} className="flex flex-col gap-3">
          <input
            name="name"
            required
            placeholder="اسم المنتج *"
            className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <select
            name="category"
            className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="food">مواد غذائية</option>
            <option value="cleaning">تنظيف</option>
            <option value="building">بناء</option>
            <option value="electronics">إلكترونيات</option>
            <option value="other">أخرى</option>
          </select>
          <select
            name="unit"
            className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="piece">قطعة</option>
            <option value="kg">كيلو</option>
            <option value="liter">لتر</option>
            <option value="box">صندوق</option>
            <option value="pack">عبوة</option>
            <option value="meter">متر</option>
          </select>
          <textarea
            name="notes"
            placeholder="ملاحظات (اختياري)"
            rows={2}
            className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
          >
            إضافة المنتج
          </button>
        </form>
      </div>
    </div>
  );
}
