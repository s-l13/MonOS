import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fitnessProfiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { saveFitnessProfile } from "../actions";
import Link from "next/link";

const ACTIVITIES = [
  { value: "sedentary",    label: "خامل (لا رياضة)" },
  { value: "light",        label: "خفيف (1-3 أيام/أسبوع)" },
  { value: "moderate",     label: "معتدل (3-5 أيام/أسبوع)" },
  { value: "active",       label: "نشيط (6-7 أيام/أسبوع)" },
  { value: "very_active",  label: "خارق النشاط" },
];

const GOALS = [
  { value: "weight_loss",    label: "تخسيس" },
  { value: "weight_gain",    label: "زيادة الوزن" },
  { value: "muscle_gain",    label: "بناء العضلات" },
  { value: "cutting",        label: "تحديد" },
  { value: "general_health", label: "صحة عامة" },
];

export default async function FitnessProfilePage() {
  const { userId } = await auth();
  if (!userId) return null;

  const rows = await db.select().from(fitnessProfiles).where(eq(fitnessProfiles.user_id, userId)).limit(1);
  const fp = rows[0] ?? null;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-2xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">الملف الرياضي</h1>
          </div>

          <Card>
            <form action={saveFitnessProfile} className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">العمر</label>
                  <input
                    name="age"
                    type="number"
                    defaultValue={fp?.age ?? ""}
                    placeholder="25"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">الجنس</label>
                  <select
                    name="gender"
                    defaultValue={fp?.gender ?? ""}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">اختر</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">الطول (سم)</label>
                  <input
                    name="height"
                    type="number"
                    step="0.1"
                    defaultValue={fp?.height ?? ""}
                    placeholder="175"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">الوزن الحالي (كغ)</label>
                  <input
                    name="current_weight"
                    type="number"
                    step="0.1"
                    defaultValue={fp?.current_weight ?? ""}
                    placeholder="80"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">الوزن المستهدف (كغ)</label>
                  <input
                    name="target_weight"
                    type="number"
                    step="0.1"
                    defaultValue={fp?.target_weight ?? ""}
                    placeholder="70"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">مستوى النشاط</label>
                <select
                  name="activity_level"
                  defaultValue={fp?.activity_level ?? "moderate"}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:outline-none"
                >
                  {ACTIVITIES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">الهدف الرياضي</label>
                <select
                  name="goal"
                  defaultValue={fp?.goal ?? "general_health"}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:outline-none"
                >
                  {GOALS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">أيام التمرين في الأسبوع</label>
                <input
                  name="workout_days_per_week"
                  type="number"
                  min="1"
                  max="7"
                  defaultValue={fp?.workout_days_per_week ?? 3}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">ملاحظات صحية</label>
                <textarea
                  name="health_notes"
                  rows={3}
                  defaultValue={fp?.health_notes ?? ""}
                  placeholder="أي حالات صحية أو إصابات..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                {fp ? "تحديث الملف" : "حفظ الملف"}
              </button>
            </form>
          </Card>

        </div>
      </main>
    </div>
  );
}
