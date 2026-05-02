import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { priceProducts, priceEntries, profiles } from "@/lib/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { addPriceEntry, deletePriceEntry } from "../actions";
import TaxSettings from "../TaxSettings";

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

// ---------------------------------------------------------------------------
// Tax helpers
// ---------------------------------------------------------------------------

function computePrices(unitPrice: number, includesTax: boolean, taxRate: number) {
  if (includesTax) {
    return { withoutTax: unitPrice / (1 + taxRate / 100), withTax: unitPrice };
  }
  return { withoutTax: unitPrice, withTax: unitPrice * (1 + taxRate / 100) };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PriceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, sessionClaims } = await auth();
  const isSuperAdmin = (sessionClaims?.metadata as { role?: string })?.role === "super_admin";
  const { id } = await params;

  const [product] = await db
    .select()
    .from(priceProducts)
    .where(eq(priceProducts.id, id))
    .limit(1);

  if (!product) notFound();

  // Fetch entries and user tax rate in parallel
  const [entries, profileRows] = await Promise.all([
    db.select().from(priceEntries).where(eq(priceEntries.product_id, id)).orderBy(asc(priceEntries.unit_price)),
    userId
      ? db.select({ tax_rate: profiles.tax_rate }).from(profiles).where(eq(profiles.id, userId)).limit(1)
      : Promise.resolve([]),
  ]);

  const taxRate = profileRows[0]?.tax_rate ? parseFloat(String(profileRows[0].tax_rate)) : 15;

  // Compute normalized prices for every entry
  const enriched = entries
    .map((e) => {
      const up = Number(e.unit_price);
      const { withoutTax, withTax } = computePrices(up, e.includes_tax, taxRate);
      return { ...e, up, withoutTax, withTax };
    })
    .sort((a, b) => a.withoutTax - b.withoutTax);

  // Stats from normalized prices
  const minPretax  = enriched.length > 0 ? enriched[0].withoutTax : null;
  const maxPretax  = enriched.length > 0 ? enriched[enriched.length - 1].withoutTax : null;
  const avgPretax  = enriched.length > 0
    ? enriched.reduce((s, e) => s + e.withoutTax, 0) / enriched.length
    : null;
  const total = enriched.length;

  // For super admin: contributor emails
  let emailMap = new Map<string, string>();
  if (isSuperAdmin && entries.length > 0) {
    const distinctIds = [...new Set(entries.map((e) => e.user_id))];
    const profileData = await db
      .select({ id: profiles.id, email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.id, distinctIds));
    emailMap = new Map(profileData.map((p) => [p.id, p.email ?? p.id]));
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8" dir="rtl">
      <Link
        href="/prices"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-6 transition"
      >
        ← مقارنة الأسعار
      </Link>

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

      {/* Tax settings */}
      {userId && <div className="mb-6"><TaxSettings taxRate={taxRate} /></div>}

      {/* Stat cards — all prices WITHOUT tax (fair baseline) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-gray-900 border border-green-900/40 p-4">
          <p className="text-gray-400 text-xs mb-1">أرخص سعر (بدون ضريبة)</p>
          <p className="text-green-400 text-xl font-bold">
            {minPretax !== null ? `${minPretax.toFixed(2)} ر.س` : "—"}
          </p>
          {minPretax !== null && (
            <p className="text-gray-600 text-xs mt-1">
              مع ضريبة: {(minPretax * (1 + taxRate / 100)).toFixed(2)} ر.س
            </p>
          )}
        </div>
        <div className="rounded-xl bg-gray-900 border border-red-900/40 p-4">
          <p className="text-gray-400 text-xs mb-1">أغلى سعر (بدون ضريبة)</p>
          <p className="text-red-400 text-xl font-bold">
            {maxPretax !== null ? `${maxPretax.toFixed(2)} ر.س` : "—"}
          </p>
          {maxPretax !== null && (
            <p className="text-gray-600 text-xs mt-1">
              مع ضريبة: {(maxPretax * (1 + taxRate / 100)).toFixed(2)} ر.س
            </p>
          )}
        </div>
        <div className="rounded-xl bg-gray-900 border border-blue-900/40 p-4">
          <p className="text-gray-400 text-xs mb-1">متوسط السعر (بدون ضريبة)</p>
          <p className="text-blue-400 text-xl font-bold">
            {avgPretax !== null ? `${avgPretax.toFixed(2)} ر.س` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-gray-400 text-xs mb-1">عدد السجلات</p>
          <p className="text-gray-100 text-xl font-bold">{total}</p>
        </div>
      </div>

      {/* Comparison table */}
      {enriched.length > 0 && (
        <div className="mb-10 overflow-x-auto">
          <p className="text-xs text-gray-600 mb-2">
            مرتّبة حسب السعر بدون ضريبة — نسبة الضريبة المطبقة: {taxRate}%
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs">
                <th className="text-right py-2 px-3 font-medium">التاريخ</th>
                <th className="text-right py-2 px-3 font-medium">المتجر</th>
                <th className="text-right py-2 px-3 font-medium">المدينة</th>
                <th className="text-right py-2 px-3 font-medium">الكمية</th>
                <th className="text-right py-2 px-3 font-medium">السعر الكلي</th>
                <th className="text-right py-2 px-3 font-medium">شامل ضريبة؟</th>
                <th className="text-right py-2 px-3 font-medium">بدون ضريبة</th>
                <th className="text-right py-2 px-3 font-medium">مع ضريبة</th>
                <th className="text-right py-2 px-3 font-medium">تصنيف</th>
                {isSuperAdmin && (
                  <th className="text-right py-2 px-3 font-medium">المسجّل</th>
                )}
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {enriched.map((entry, idx) => {
                const isMin    = idx === 0;
                const isMax    = idx === enriched.length - 1 && enriched.length > 1;
                const canDelete = entry.user_id === userId || isSuperAdmin;
                return (
                  <tr key={entry.id} className="border-b border-gray-800/60 hover:bg-gray-900/50">
                    <td className="py-2 px-3 text-gray-400 text-xs whitespace-nowrap">{entry.purchase_date}</td>
                    <td className="py-2 px-3 font-medium">{entry.store_name}</td>
                    <td className="py-2 px-3 text-gray-400">{entry.city ?? "—"}</td>
                    <td className="py-2 px-3 text-gray-300">{Number(entry.quantity).toFixed(2)}</td>
                    <td className="py-2 px-3 text-gray-300">{Number(entry.price).toFixed(2)} ر.س</td>
                    <td className="py-2 px-3">
                      {entry.includes_tax ? (
                        <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-400">نعم</span>
                      ) : (
                        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">لا</span>
                      )}
                    </td>
                    <td className={`py-2 px-3 font-semibold tabular-nums ${isMin ? "text-green-400" : isMax ? "text-red-400" : "text-gray-200"}`}>
                      {entry.withoutTax.toFixed(2)} ر.س
                    </td>
                    <td className="py-2 px-3 text-gray-400 tabular-nums text-xs">
                      {entry.withTax.toFixed(2)} ر.س
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
                    {isSuperAdmin && (
                      <td className="py-2 px-3 text-gray-400 text-xs">
                        {emailMap.get(entry.user_id) ?? entry.user_id}
                      </td>
                    )}
                    <td className="py-2 px-3">
                      {canDelete && (
                        <form action={deletePriceEntry}>
                          <input type="hidden" name="id" value={entry.id} />
                          <input type="hidden" name="product_id" value={id} />
                          <button type="submit" className="text-red-500 hover:text-red-400 text-xs transition">
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
          {/* Tax checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              name="includes_tax"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 accent-blue-500"
            />
            <span className="text-sm text-gray-300">
              السعر شامل ضريبة القيمة المضافة ({taxRate}%)
            </span>
          </label>
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
