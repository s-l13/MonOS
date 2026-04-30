import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { priceProducts, priceEntries } from "@/lib/schema";
import { sql, eq, asc } from "drizzle-orm";
import { addPriceEntry, deletePriceEntry } from "../actions";

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

export default async function PriceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  const { id } = await params;

  const [product] = await db
    .select()
    .from(priceProducts)
    .where(eq(priceProducts.id, id))
    .limit(1);

  if (!product) notFound();

  const entries = await db
    .select()
    .from(priceEntries)
    .where(eq(priceEntries.product_id, id))
    .orderBy(asc(priceEntries.unit_price));

  const [aggRow] = await db
    .select({
      min_unit:    sql<string>`min(${priceEntries.unit_price})`,
      max_unit:    sql<string>`max(${priceEntries.unit_price})`,
      avg_unit:    sql<string>`avg(${priceEntries.unit_price})`,
      total:       sql<number>`count(*)::int`,
    })
    .from(priceEntries)
    .where(eq(priceEntries.product_id, id));

  const minPrice = aggRow?.min_unit ? Number(aggRow.min_unit) : null;
  const maxPrice = aggRow?.max_unit ? Number(aggRow.max_unit) : null;
  const avgPrice = aggRow?.avg_unit ? Number(aggRow.avg_unit) : null;
  const total    = aggRow?.total ?? 0;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8" dir="rtl">
      <div className="mb-6">
        <Link href="/prices" className="text-gray-400 hover:text-gray-200 text-sm">
          ← العودة للمنتجات
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <span className="rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-300">
            {CATEGORIES[product.category] ?? product.category}
          </span>
          <span className="rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-xs text-gray-400">
            {UNITS[product.unit] ?? product.unit}
          </span>
        </div>
        <p className="text-gray-500 text-xs">
          أضيف في {new Date(product.created_at).toLocaleDateString("ar-SA")}
          {product.notes && ` · ${product.notes}`}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-gray-900 border border-green-900/40 p-4">
          <p className="text-gray-400 text-xs mb-1">أرخص سعر</p>
          <p className="text-green-400 text-xl font-bold">
            {minPrice !== null ? `${minPrice.toFixed(2)} ر.س` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-red-900/40 p-4">
          <p className="text-gray-400 text-xs mb-1">أغلى سعر</p>
          <p className="text-red-400 text-xl font-bold">
            {maxPrice !== null ? `${maxPrice.toFixed(2)} ر.س` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-blue-900/40 p-4">
          <p className="text-gray-400 text-xs mb-1">متوسط السعر</p>
          <p className="text-blue-400 text-xl font-bold">
            {avgPrice !== null ? `${avgPrice.toFixed(2)} ر.س` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-gray-400 text-xs mb-1">عدد السجلات</p>
          <p className="text-gray-100 text-xl font-bold">{total}</p>
        </div>
      </div>

      {/* Comparison table */}
      {entries.length > 0 && (
        <div className="mb-10 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs">
                <th className="text-right py-2 px-3 font-medium">التاريخ</th>
                <th className="text-right py-2 px-3 font-medium">المتجر</th>
                <th className="text-right py-2 px-3 font-medium">المدينة</th>
                <th className="text-right py-2 px-3 font-medium">الكمية</th>
                <th className="text-right py-2 px-3 font-medium">السعر الكلي</th>
                <th className="text-right py-2 px-3 font-medium">سعر الوحدة</th>
                <th className="text-right py-2 px-3 font-medium">تصنيف</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const up = Number(entry.unit_price);
                const isMin = minPrice !== null && up === minPrice;
                const isMax = maxPrice !== null && up === maxPrice;
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-gray-800/60 hover:bg-gray-900/50"
                  >
                    <td className="py-2 px-3 text-gray-400 text-xs whitespace-nowrap">
                      {entry.purchase_date}
                    </td>
                    <td className="py-2 px-3 font-medium">{entry.store_name}</td>
                    <td className="py-2 px-3 text-gray-400">{entry.city ?? "—"}</td>
                    <td className="py-2 px-3 text-gray-300">{Number(entry.quantity).toFixed(2)}</td>
                    <td className="py-2 px-3 text-gray-300">{Number(entry.price).toFixed(2)} ر.س</td>
                    <td className={`py-2 px-3 font-semibold ${isMin ? "text-green-400" : isMax ? "text-red-400" : "text-gray-200"}`}>
                      {up.toFixed(2)} ر.س
                    </td>
                    <td className="py-2 px-3">
                      {isMin ? (
                        <span className="rounded-full bg-green-900/50 text-green-400 px-2 py-0.5 text-xs">الأرخص</span>
                      ) : isMax ? (
                        <span className="rounded-full bg-red-900/50 text-red-400 px-2 py-0.5 text-xs">الأغلى</span>
                      ) : (
                        <span className="rounded-full bg-gray-800 text-gray-400 px-2 py-0.5 text-xs">مناسب</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {entry.user_id === userId && (
                        <form action={deletePriceEntry}>
                          <input type="hidden" name="id" value={entry.id} />
                          <input type="hidden" name="product_id" value={id} />
                          <button
                            type="submit"
                            className="text-red-500 hover:text-red-400 text-xs transition"
                          >
                            حذف
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add entry form */}
      <div id="add" className="rounded-xl bg-gray-900 border border-gray-800 p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">إضافة سعر جديد</h2>
        <form action={addPriceEntry} className="flex flex-col gap-3">
          <input type="hidden" name="product_id" value={id} />
          <input
            name="store_name"
            required
            placeholder="اسم المتجر *"
            className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            name="city"
            placeholder="المدينة (اختياري)"
            className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
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
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">الكمية</label>
              <input
                name="quantity"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue="1"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">تاريخ الشراء</label>
            <input
              name="purchase_date"
              type="date"
              defaultValue={today}
              required
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <textarea
            name="notes"
            placeholder="ملاحظات (اختياري)"
            rows={2}
            className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
          >
            إضافة السعر
          </button>
        </form>
      </div>
    </div>
  );
}
