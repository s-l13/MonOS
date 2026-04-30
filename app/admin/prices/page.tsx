import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { priceEntries, priceProducts, profiles } from "@/lib/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { deletePriceEntry, banUserFromPricing, unbanUserFromPricing } from "@/app/prices/actions";

export default async function AdminPricesPage() {
  const { sessionClaims } = await auth();
  const isSuperAdmin = (sessionClaims?.metadata as { role?: string })?.role === "super_admin";
  if (!isSuperAdmin) redirect("/");

  // All entries with product info
  const entries = await db
    .select({
      id:            priceEntries.id,
      user_id:       priceEntries.user_id,
      product_id:    priceEntries.product_id,
      store_name:    priceEntries.store_name,
      city:          priceEntries.city,
      price:         priceEntries.price,
      unit_price:    priceEntries.unit_price,
      quantity:      priceEntries.quantity,
      purchase_date: priceEntries.purchase_date,
      product_name:  priceProducts.name,
      product_unit:  priceProducts.unit,
    })
    .from(priceEntries)
    .leftJoin(priceProducts, eq(priceEntries.product_id, priceProducts.id))
    .orderBy(asc(priceEntries.purchase_date));

  // Fetch emails for all contributors
  const contributorIds = [...new Set(entries.map((e) => e.user_id))];
  const contributorProfiles =
    contributorIds.length > 0
      ? await db
          .select({ id: profiles.id, email: profiles.email, prices_banned: profiles.prices_banned })
          .from(profiles)
          .where(inArray(profiles.id, contributorIds))
      : [];
  const emailMap = new Map(contributorProfiles.map((p) => [p.id, p.email ?? p.id]));
  const bannedSet = new Set(contributorProfiles.filter((p) => p.prices_banned).map((p) => p.id));

  // All users for ban management
  const allUsers = await db
    .select({ id: profiles.id, email: profiles.email, prices_banned: profiles.prices_banned })
    .from(profiles)
    .orderBy(asc(profiles.email));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8" dir="rtl">
      <div className="mb-4">
        <Link href="/admin/users" className="text-sm text-gray-400 hover:text-gray-200 transition">
          ← لوحة الإدارة
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">إدارة التسعير</h1>
      <p className="text-gray-500 text-sm mb-8">عرض جميع السجلات والتحكم في صلاحيات المستخدمين</p>

      {/* ── All entries ── */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">جميع سجلات الأسعار ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="text-gray-500">لا توجد سجلات بعد.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900 text-gray-400 text-xs">
                  <th className="text-right py-2 px-3 font-medium">المنتج</th>
                  <th className="text-right py-2 px-3 font-medium">المتجر</th>
                  <th className="text-right py-2 px-3 font-medium">المدينة</th>
                  <th className="text-right py-2 px-3 font-medium">السعر</th>
                  <th className="text-right py-2 px-3 font-medium">سعر الوحدة</th>
                  <th className="text-right py-2 px-3 font-medium">التاريخ</th>
                  <th className="text-right py-2 px-3 font-medium">المساهم</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isBanned = bannedSet.has(entry.user_id);
                  return (
                    <tr key={entry.id} className="border-b border-gray-800/60 hover:bg-gray-900/40">
                      <td className="py-2 px-3 font-medium">
                        <Link
                          href={`/prices/${entry.product_id}`}
                          className="hover:text-blue-400 transition"
                        >
                          {entry.product_name ?? "—"}
                        </Link>
                        <span className="mr-1 text-gray-500 text-xs">/ {entry.product_unit}</span>
                      </td>
                      <td className="py-2 px-3">{entry.store_name}</td>
                      <td className="py-2 px-3 text-gray-400">{entry.city ?? "—"}</td>
                      <td className="py-2 px-3 text-gray-300">{Number(entry.price).toFixed(2)} ر.س</td>
                      <td className="py-2 px-3 text-gray-300">{Number(entry.unit_price).toFixed(2)} ر.س</td>
                      <td className="py-2 px-3 text-gray-400 text-xs whitespace-nowrap">{entry.purchase_date}</td>
                      <td className="py-2 px-3 text-xs">
                        <span className="text-gray-300">{emailMap.get(entry.user_id) ?? entry.user_id}</span>
                        {isBanned && (
                          <span className="mr-1 rounded-full bg-red-900/50 text-red-400 px-1.5 py-0.5 text-[10px]">
                            محظور
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── User ban management ── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">صلاحيات المستخدمين في التسعير</h2>
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900 text-gray-400 text-xs">
                <th className="text-right py-2 px-4 font-medium">المستخدم</th>
                <th className="text-right py-2 px-4 font-medium">الحالة</th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-800/60 hover:bg-gray-900/40">
                  <td className="py-2 px-4 text-gray-200">{user.email ?? user.id}</td>
                  <td className="py-2 px-4">
                    {user.prices_banned ? (
                      <span className="rounded-full bg-red-900/50 text-red-400 px-2 py-0.5 text-xs">محظور من التسعير</span>
                    ) : (
                      <span className="rounded-full bg-green-900/40 text-green-400 px-2 py-0.5 text-xs">مفعّل</span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-left">
                    {user.prices_banned ? (
                      <form action={unbanUserFromPricing}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-green-700 px-3 py-1 text-xs text-white hover:bg-green-600 transition"
                        >
                          رفع الحظر
                        </button>
                      </form>
                    ) : (
                      <form action={banUserFromPricing}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-red-800 px-3 py-1 text-xs text-white hover:bg-red-700 transition"
                        >
                          حظر من التسعير
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
