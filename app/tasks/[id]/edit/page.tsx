import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { tasks, taskSubtasks, entities, projects } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { updateTask } from "./actions";
import { createSubtask, toggleSubtaskStatus, deleteSubtask } from "../../subtask-actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTaskPage({ params }: Props) {
  const { id } = await params;

  const [[taskRow], entityOptions, projectOptions, subtaskList] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.id, id)),
    db.select({ id: entities.id, name: entities.name }).from(entities).orderBy(desc(entities.created_at)),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(desc(projects.created_at)),
    db.select().from(taskSubtasks).where(eq(taskSubtasks.task_id, id)).orderBy(desc(taskSubtasks.created_at)),
  ]);

  if (!taskRow) {
    return (
      <div className="min-h-screen md:flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10">
          <p className="text-red-400">تعذر العثور على المهمة.</p>
        </main>
      </div>
    );
  }

  const totalSubtasks = subtaskList.length;
  const completedSubtasks = subtaskList.filter((s) => s.is_completed).length;
  const calculatedProgress =
    totalSubtasks > 0
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : taskRow.progress_percent ?? 0;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">تعديل المهمة</h1>
            <p className="mt-2 text-gray-400">تحديث بيانات المهمة الحالية</p>
          </header>

          <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            <form action={updateTask} className="grid gap-5">
              <input type="hidden" name="id" value={taskRow.id} />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">عنوان المهمة</label>
                <input name="title" type="text" required defaultValue={taskRow.title} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">نوع المهمة</label>
                  <select name="task_type" defaultValue={taskRow.task_type} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="personal">شخصية</option>
                    <option value="entity">كيان</option>
                    <option value="project">مشروع</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">السياق</label>
                  <input name="context_label" type="text" defaultValue={taskRow.context_label ?? ""} placeholder="مثال: المزرعة، البيت، شركة" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الكيان</label>
                  <select name="entity_id" defaultValue={taskRow.entity_id ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="">بدون كيان</option>
                    {entityOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">المشروع</label>
                  <select name="project_id" defaultValue={taskRow.project_id ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="">بدون مشروع</option>
                    {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الوصف</label>
                <textarea name="description" rows={4} defaultValue={taskRow.description ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الأولوية</label>
                  <select name="priority" defaultValue={taskRow.priority} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="low">منخفض</option>
                    <option value="medium">متوسط</option>
                    <option value="high">عالي</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">الحالة</label>
                  <select name="status" defaultValue={taskRow.status} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                    <option value="new">جديدة</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="completed">مكتملة</option>
                    <option value="late">متأخرة</option>
                    <option value="postponed">مؤجلة</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">نسبة الإنجاز اليدوية %</label>
                  <input name="progress_percent" type="number" min="0" max="100" defaultValue={taskRow.progress_percent ?? 0} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">تاريخ البداية</label>
                  <input name="start_date" type="date" defaultValue={taskRow.start_date ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">تاريخ الاستحقاق</label>
                  <input name="due_date" type="date" defaultValue={taskRow.due_date ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">وقت المهمة</label>
                  <input name="due_time" type="time" defaultValue={taskRow.due_time ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">التكرار</label>
                <input name="recurrence_rule" type="text" defaultValue={taskRow.recurrence_rule ?? ""} placeholder="مثال: أسبوعي" className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input name="is_all_day" type="checkbox" defaultChecked={taskRow.is_all_day ?? true} /> المهمة طوال اليوم
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input name="sync_to_calendar" type="checkbox" defaultChecked={taskRow.sync_to_calendar ?? false} /> ربط مع التقويم
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input name="remind_one_week" type="checkbox" defaultChecked={taskRow.remind_one_week ?? true} /> تذكير قبل أسبوع
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input name="remind_one_day" type="checkbox" defaultChecked={taskRow.remind_one_day ?? true} /> تذكير قبل يوم
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">ملاحظات</label>
                <textarea name="notes" rows={3} defaultValue={taskRow.notes ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="flex justify-end gap-3">
                <a href="/tasks" className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800">إلغاء</a>
                <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700">حفظ التعديلات</button>
              </div>
            </form>
          </section>

          <section className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-100">المهام الفرعية</h2>
              <p className="mt-1 text-sm text-gray-400">
                عدد المنجز: {completedSubtasks} من {totalSubtasks} — النسبة المحسوبة: {calculatedProgress}%
              </p>
            </div>

            <div className="mb-6 h-3 w-full rounded-full bg-gray-800">
              <div className="h-3 rounded-full bg-blue-600" style={{ width: `${calculatedProgress}%` }} />
            </div>

            <form action={createSubtask} className="mb-6 flex gap-3">
              <input type="hidden" name="task_id" value={taskRow.id} />
              <input name="title" type="text" required placeholder="أضف مهمة فرعية جديدة" className="flex-1 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700">إضافة</button>
            </form>

            {subtaskList.length === 0 ? (
              <p className="text-gray-500">لا توجد مهام فرعية بعد.</p>
            ) : (
              <div className="space-y-3">
                {subtaskList.map((subtask) => (
                  <div key={subtask.id} className="flex items-center justify-between rounded-lg border border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                      <form action={toggleSubtaskStatus}>
                        <input type="hidden" name="task_id" value={taskRow.id} />
                        <input type="hidden" name="subtask_id" value={subtask.id} />
                        <input type="hidden" name="current_value" value={String(subtask.is_completed)} />
                        <button
                          type="submit"
                          className={`h-5 w-5 rounded border ${subtask.is_completed ? "bg-green-600 border-green-600" : "bg-gray-800 border-gray-600"}`}
                          title="تبديل الحالة"
                        />
                      </form>
                      <span className={subtask.is_completed ? "text-sm text-gray-500 line-through" : "text-sm text-gray-200"}>
                        {subtask.title}
                      </span>
                    </div>
                    <form action={deleteSubtask}>
                      <input type="hidden" name="task_id" value={taskRow.id} />
                      <input type="hidden" name="subtask_id" value={subtask.id} />
                      <button type="submit" className="rounded-lg bg-red-900/40 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/60">حذف</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
