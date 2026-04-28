import Sidebar from "@/components/sidebar";
import StatusBadge from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { tasks, taskSubtasks, taskAssignments, entities, projects } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { createSubtask, toggleSubtaskStatus, deleteSubtask } from "../subtask-actions";
import { assignTask } from "../assignment-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assign_error?: string }>;
};

export default async function TaskDetailsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { assign_error } = await searchParams;

  const [[taskRow], subtaskList, assignmentList] = await Promise.all([
    db.select({
      id: tasks.id,
      title: tasks.title,
      task_type: tasks.task_type,
      context_label: tasks.context_label,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      progress_percent: tasks.progress_percent,
      start_date: tasks.start_date,
      due_date: tasks.due_date,
      due_time: tasks.due_time,
      is_all_day: tasks.is_all_day,
      recurrence_rule: tasks.recurrence_rule,
      sync_to_calendar: tasks.sync_to_calendar,
      remind_one_week: tasks.remind_one_week,
      remind_one_day: tasks.remind_one_day,
      notes: tasks.notes,
      entityName: entities.name,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(entities, eq(tasks.entity_id, entities.id))
    .leftJoin(projects, eq(tasks.project_id, projects.id))
    .where(eq(tasks.id, id)),
    db.select().from(taskSubtasks).where(eq(taskSubtasks.task_id, id)).orderBy(desc(taskSubtasks.created_at)),
    db.select().from(taskAssignments).where(eq(taskAssignments.task_id, id)).orderBy(desc(taskAssignments.created_at)),
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
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">{taskRow.title}</h1>
              <p className="mt-2 text-gray-400">صفحة متابعة المهمة وتفاصيل الإنجاز</p>
            </div>
            <div className="flex gap-3">
              <a href="/tasks" className="rounded-lg border border-gray-700 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800">رجوع</a>
              <a href={`/tasks/${taskRow.id}/edit`} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700">تعديل المهمة</a>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg lg:col-span-2">
              <h2 className="mb-4 text-xl font-semibold text-gray-100">ملخص المهمة</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard label="نوع المهمة" value={translateTaskType(taskRow.task_type)} />
                <InfoCard label="السياق" value={taskRow.context_label ?? "-"} />
                <InfoCard label="الكيان" value={taskRow.entityName ?? "-"} />
                <InfoCard label="المشروع" value={taskRow.projectName ?? "-"} />
                <InfoCard label="الأولوية" value={translatePriority(taskRow.priority)} />
                <InfoCard label="الحالة" value={translateStatus(taskRow.status)} />
                <InfoCard label="تاريخ البداية" value={taskRow.start_date ?? "-"} />
                <InfoCard label="تاريخ الاستحقاق" value={taskRow.due_date ?? "-"} />
                <InfoCard label="وقت المهمة" value={taskRow.due_time ?? "-"} />
                <InfoCard label="طوال اليوم" value={taskRow.is_all_day ? "نعم" : "لا"} />
                <InfoCard label="ربط بالتقويم" value={taskRow.sync_to_calendar ? "نعم" : "لا"} />
                <InfoCard label="التكرار" value={taskRow.recurrence_rule ?? "-"} />
              </div>
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-medium text-gray-300">الوصف</h3>
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">{taskRow.description || "لا يوجد وصف."}</div>
              </div>
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-gray-300">الملاحظات</h3>
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">{taskRow.notes || "لا توجد ملاحظات."}</div>
              </div>
            </div>

            <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-semibold text-gray-100">نسبة الإنجاز</h2>
              <p className="text-4xl font-bold text-gray-100">{calculatedProgress}%</p>
              <div className="mt-4 h-4 w-full rounded-full bg-gray-800">
                <div className="h-4 rounded-full bg-blue-600 transition-all" style={{ width: `${calculatedProgress}%` }} />
              </div>
              <div className="mt-6 space-y-3 text-sm text-gray-400">
                <p>عدد المهام الفرعية: {totalSubtasks}</p>
                <p>المهام المنجزة: {completedSubtasks}</p>
                <p>المتبقي: {Math.max(totalSubtasks - completedSubtasks, 0)}</p>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-100">المهام الفرعية</h2>
              <p className="mt-1 text-sm text-gray-400">أضف خطوات التنفيذ وتابع الإنجاز مباشرة</p>
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
                          className={`h-5 w-5 rounded border ${subtask.is_completed ? "border-green-600 bg-green-600" : "border-gray-600 bg-gray-800"}`}
                          title="تبديل حالة الإنجاز"
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

          {/* Assignment section */}
          <section className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            <h2 className="mb-1 text-xl font-semibold text-gray-100">إسناد المهمة لمستخدم آخر</h2>
            <p className="mb-5 text-sm text-gray-400">أدخل بريد المستخدم المسجّل في المنصة لإسناد المهمة إليه</p>

            {assign_error === "not_found" && (
              <div className="mb-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
                المستخدم غير مسجل في المنصة
              </div>
            )}

            <form action={assignTask} className="grid gap-4">
              <input type="hidden" name="task_id" value={taskRow.id} />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">البريد الإلكتروني</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ادخل ايميل المستخدم"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">تعليق (اختياري)</label>
                <textarea
                  name="comment"
                  rows={3}
                  placeholder="اضف تعليقاً..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700">
                  إسناد المهمة
                </button>
              </div>
            </form>

            {assignmentList.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-medium text-gray-300">الإسنادات الحالية</h3>
                <div className="space-y-3">
                  {assignmentList.map((a) => (
                    <div key={a.id} className="rounded-lg border border-gray-700 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200">{a.assigned_to_email}</p>
                          {a.comment && (
                            <p className="mt-1 text-xs text-gray-400">{a.comment}</p>
                          )}
                          <p className="mt-2 text-xs text-gray-500">
                            {a.created_at.toISOString().slice(0, 10)}
                          </p>
                        </div>
                        <StatusBadge status={a.status} label={translateAssignmentStatus(a.status)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-700 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-gray-200">{value}</p>
    </div>
  );
}

function translateAssignmentStatus(status: string) {
  switch (status) {
    case "pending":     return "قيد الانتظار";
    case "in_progress": return "قيد التنفيذ";
    case "completed":   return "مكتملة";
    case "rejected":    return "مرفوضة";
    default:            return status;
  }
}

function translateTaskType(type: string) {
  switch (type) {
    case "personal": return "شخصية";
    case "entity": return "كيان";
    case "project": return "مشروع";
    default: return type;
  }
}

function translatePriority(priority: string) {
  switch (priority) {
    case "low": return "منخفض";
    case "medium": return "متوسط";
    case "high": return "عالي";
    case "urgent": return "عاجل";
    default: return priority;
  }
}

function translateStatus(status: string) {
  switch (status) {
    case "new": return "جديدة";
    case "in_progress": return "قيد التنفيذ";
    case "completed": return "مكتملة";
    case "late": return "متأخرة";
    case "postponed": return "مؤجلة";
    default: return status;
  }
}
