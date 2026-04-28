import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { entities } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { createProject } from "./actions";

export default async function NewProjectPage() {
  const entityOptions = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .orderBy(desc(entities.created_at));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">إضافة مشروع جديد</h1>
            <p className="mt-2 text-gray-400">إنشاء مشروع وربطه بأحد الكيانات الموجودة</p>
          </header>

          <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            {entityOptions.length === 0 ? (
              <p className="text-gray-400">
                لا توجد كيانات متاحة. أضف كيانًا أولًا قبل إنشاء مشروع.
              </p>
            ) : (
              <form action={createProject} className="grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">اسم المشروع</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="مثال: تطوير منصة إدارة"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الكيان</label>
                  <select
                    name="entity_id"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>اختر الكيان</option>
                    {entityOptions.map((entity) => (
                      <option key={entity.id} value={entity.id}>{entity.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">نوع الملكية</label>
                  <select name="ownership_type" defaultValue="sole" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="sole">ملكية فردية</option>
                    <option value="partnership">شراكة</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">رأس المال</label>
                  <input name="capital_amount" type="number" min="0" step="0.01" defaultValue="0" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الحالة</label>
                  <select name="status" defaultValue="planning" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="planning">تخطيط</option>
                    <option value="active">نشط</option>
                    <option value="completed">مكتمل</option>
                    <option value="paused">متوقف</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">نسبة الإنجاز</label>
                  <input name="progress_percent" type="number" min="0" max="100" defaultValue="0" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">تاريخ البداية</label>
                  <input name="start_date" type="date" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الوصف</label>
                  <textarea name="description" rows={4} placeholder="وصف مختصر للمشروع" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">ملاحظات</label>
                  <textarea name="notes" rows={3} placeholder="أي ملاحظات إضافية" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>

                <div className="flex justify-end">
                  <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700">
                    حفظ المشروع
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
