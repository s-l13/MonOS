import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { entities, projects } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { createTask } from "./actions";

export default async function NewTaskPage() {
  const [entityOptions, projectOptions] = await Promise.all([
    db.select({ id: entities.id, name: entities.name }).from(entities).orderBy(desc(entities.created_at)),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(desc(projects.created_at)),
  ]);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">إضافة مهمة</h1>
            <p className="mt-2 text-gray-400">إنشاء مهمة شخصية أو مرتبطة بكيان أو مشروع</p>
          </header>

          <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            <form action={createTask} className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">عنوان المهمة</label>
                <input name="title" type="text" required placeholder="مثال: مراجعة عرض العميل" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">نوع المهمة</label>
                  <select name="task_type" defaultValue="personal" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="personal">شخصية</option>
                    <option value="entity">كيان</option>
                    <option value="project">مشروع</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">السياق</label>
                  <input name="context_label" type="text" placeholder="مثال: المزرعة، البيت، شركة" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الكيان</label>
                  <select name="entity_id" defaultValue="" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="">بدون كيان</option>
                    {entityOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">المشروع</label>
                  <select name="project_id" defaultValue="" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="">بدون مشروع</option>
                    {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الوصف</label>
                <textarea name="description" rows={4} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الأولوية</label>
                  <select name="priority" defaultValue="medium" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="low">منخفض</option>
                    <option value="medium">متوسط</option>
                    <option value="high">عالي</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الحالة</label>
                  <select name="status" defaultValue="new" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="new">جديدة</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="completed">مكتملة</option>
                    <option value="late">متأخرة</option>
                    <option value="postponed">مؤجلة</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">نسبة الإنجاز اليدوية %</label>
                  <input name="progress_percent" type="number" min="0" max="100" defaultValue="0" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">تاريخ البداية</label>
                  <input name="start_date" type="date" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">تاريخ الاستحقاق</label>
                  <input name="due_date" type="date" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">وقت المهمة</label>
                  <input name="due_time" type="time" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">التكرار</label>
                <input name="recurrence_rule" type="text" placeholder="مثال: أسبوعي" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input name="is_all_day" type="checkbox" defaultChecked /> المهمة طوال اليوم
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input name="sync_to_calendar" type="checkbox" /> ربط مع التقويم
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input name="remind_one_week" type="checkbox" defaultChecked /> تذكير قبل أسبوع
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input name="remind_one_day" type="checkbox" defaultChecked /> تذكير قبل يوم
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">ملاحظات</label>
                <textarea name="notes" rows={3} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="flex justify-end gap-3">
                <a href="/tasks" className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800">إلغاء</a>
                <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700">حفظ المهمة</button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
