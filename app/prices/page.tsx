import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { priceProducts, priceEntries } from "@/lib/schema";
import { sql, eq, count } from "drizzle-orm";
import { createProduct } from "./actions";

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
  await auth();
  const { q } = await searchParams;

  const allProducts = await db.select().from(priceProducts);

  const filtered = q
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase())
      )
    : allProducts;

  const stats = await db
    .select({
      product_id:        priceEntries.product_id,
      min_unit_price:    sql<string>`min(${priceEntries.unit_price})`,
      max_unit_price:    sql<string>`max(${priceEntries.unit_price})`,
      avg_unit_price:    sql<string>`avg(${priceEntries.unit_price})`,
      total_entries:     sql<number>`count(*)::int`,
      contributors:      sql<number>`count(distinct ${priceEntries.user_id})::int`,
      min_store_name:    sql<string>`(array_agg(${priceEntries.store_name} order by ${priceEntries.unit_price} asc))[1]`,
      min_city:          sql<string>`(array_agg(${priceEntries.city} order by ${priceEntries.unit_price} asc))[1]`,
      max_store_name:    sql<string>`(array_agg(${priceEntries.store_name} order by ${priceEntries.unit_price} desc))[1]`,
      max_city:          sql<string>`(array_agg(${priceEntries.city} order by ${priceEntries.unit_price} desc))[1]`,
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
      <h1 className="text-2xl font-bold mb-2">مقارنة الأسعار</h1>
      <p className="text-gray-400 text-sm mb-6">بيانات مشتركة بين جميع المستخدمين — الأسماء مخفية</p>

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
                    <div className="flex items-baseline gap-1">
                      <span className="text-green-400 font-bold text-lg">
                        {Number(s.min_unit_price).toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-xs">ر.س</span>
                      <span className="text-gray-500 text-xs">
                        أرخص — {s.min_store_name}{s.min_city ? ` · ${s.min_city}` : ""}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-red-400 font-semibold">
                        {Number(s.max_unit_price).toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-xs">ر.س</span>
                      <span className="text-gray-500 text-xs">
                        أغلى — {s.max_store_name}{s.max_city ? ` · ${s.max_city}` : ""}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs">
                      متوسط: <span className="text-gray-300">{Number(s.avg_unit_price).toFixed(2)} ر.س</span>
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
