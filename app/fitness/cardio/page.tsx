import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cardioLogs } from "@/lib/schema";
import { eq, gte, desc } from "drizzle-orm";
import { addCardioLog, deleteCardioLog } from "../actions";
import Link from "next/link";

const CARDIO_TYPES = ["جري", "دراجة", "سباحة", "مشي", "حبل قفز", "تجديف", "إليبتيكال", "هيت", "أخرى"];

const INTENSITY_AR: Record<string, string> = {
  low:    "منخفض",
  medium: "متوسط",
  high:   "عالٍ",
};

export default async function CardioPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const today     = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [logs, weekLogs] = await Promise.all([
    db.select().from(cardioLogs).where(eq(cardioLogs.user_id, userId)).orderBy(desc(cardioLogs.log_date)).limit(20),
    db.select().from(cardioLogs).where(eq(cardioLogs.user_id, userId)).then((all) =>
      all.filter((l) => l.log_date >= weekStart)
    ),
  ]);

  const weekMinutes  = weekLogs.reduce((s, l) => s + l.duration_minutes, 0);
  const weekCalories = weekLogs.reduce((s, l) => s + (l.calories_burned ?? 0), 0);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">الكارديو</h1>
          </div>

          {/* Weekly summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-500">جلسات هذا الأسبوع</p>
              <p className="mt-1 text-xl font-bold text-gray-100">{weekLogs.length}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-500">دقائق هذا الأسبوع</p>
              <p className="mt-1 text-xl font-bold text-blue-400">{weekMinutes}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-500">سعرات محروقة</p>
              <p className="mt-1 text-xl font-bold text-orange-400">{weekCalories || "—"}</p>
            </div>
          </div>

          {/* Add cardio form */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">تسجيل جلسة كارديو</h2>
            <form action={addCardioLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">نوع الكارديو</label>
                  <select
                    name="cardio_type"
                    required
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:outline-none"
                  >
                    {CARDIO_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">المدة (دقيقة)</label>
                  <input
                    name="duration_minutes"
                    type="number"
                    min="1"
                    required
                    placeholder="30"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">الشدة</label>
                  <select
                    name="intensity"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="low">منخفض</option>
                    <option value="medium" selected>متوسط</option>
                    <option value="high">عالٍ</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">السعرات المحروقة (اختياري)</label>
                  <input
                    name="calories_burned"
                    type="number"
                    placeholder="250"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">التاريخ</label>
                  <input
                    name="log_date"
                    type="date"
                    defaultValue={today}
                    required
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">ملاحظات</label>
                  <input
                    name="notes"
                    placeholder="اختياري"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                تسجيل
              </button>
            </form>
          </Card>

          {/* Logs table */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">السجلات الأخيرة</h2>
            {logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-600">لا سجلات بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500">
                      <th className="pb-2 font-normal">التاريخ</th>
                      <th className="pb-2 font-normal">النوع</th>
                      <th className="pb-2 font-normal">المدة</th>
                      <th className="pb-2 font-normal">الشدة</th>
                      <th className="pb-2 font-normal">السعرات</th>
                      <th className="pb-2 font-normal"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                        <td className="py-2.5 text-xs text-gray-500">{log.log_date}</td>
                        <td className="py-2.5 font-medium text-gray-200">{log.cardio_type}</td>
                        <td className="py-2.5 text-gray-300">{log.duration_minutes} د</td>
                        <td className="py-2.5 text-gray-500">{INTENSITY_AR[log.intensity ?? "medium"] ?? log.intensity}</td>
                        <td className="py-2.5 text-orange-400">{log.calories_burned ?? "—"}</td>
                        <td className="py-2.5">
                          <form action={deleteCardioLog}>
                            <input type="hidden" name="id" value={log.id} />
                            <button type="submit" className="text-xs text-red-600 hover:text-red-400">حذف</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </div>
      </main>
    </div>
  );
}
