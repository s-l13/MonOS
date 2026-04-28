import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { tasks, entities, projects } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { deleteTask } from "./actions";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import StatusBadge from "@/components/ui/status-badge";

export default async function TasksPage() {
  const taskList = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      task_type: tasks.task_type,
      context_label: tasks.context_label,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      due_date: tasks.due_date,
      progress_percent: tasks.progress_percent,
      entityName: entities.name,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(entities, eq(tasks.entity_id, entities.id))
    .leftJoin(projects, eq(tasks.project_id, projects.id))
    .orderBy(desc(tasks.created_at));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title="المهام"
            description="جميع المهام الشخصية والتشغيلية ومهام المشاريع"
            actions={<Button href="/tasks/new">إضافة مهمة</Button>}
          />

          <Card>
            {taskList.length === 0 ? (
              <p className="text-gray-400">لا توجد مهام حتى الآن.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-700 text-sm text-gray-500">
                      <th className="px-3 py-3">العنوان</th>
                      <th className="px-3 py-3">النوع</th>
                      <th className="px-3 py-3">السياق</th>
                      <th className="px-3 py-3">الكيان</th>
                      <th className="px-3 py-3">المشروع</th>
                      <th className="px-3 py-3">الأولوية</th>
                      <th className="px-3 py-3">الحالة</th>
                      <th className="px-3 py-3">الإنجاز</th>
                      <th className="px-3 py-3">تاريخ الاستحقاق</th>
                      <th className="px-3 py-3">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskList.map((task) => (
                      <tr key={task.id} className="border-b border-gray-800 text-sm">
                        <td className="px-3 py-4 font-medium text-gray-200">{task.title}</td>
                        <td className="px-3 py-4 text-gray-400">{translateTaskType(task.task_type)}</td>
                        <td className="px-3 py-4 text-gray-400">{task.context_label ?? "-"}</td>
                        <td className="px-3 py-4 text-gray-400">{task.entityName ?? "-"}</td>
                        <td className="px-3 py-4 text-gray-400">{task.projectName ?? "-"}</td>
                        <td className="px-3 py-4">
                          <StatusBadge status={task.priority} label={translatePriority(task.priority)} />
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-3 py-4 text-gray-400">{task.progress_percent ?? 0}%</td>
                        <td className="px-3 py-4 text-gray-400">{task.due_date ?? "-"}</td>
                        <td className="px-3 py-4">
                          <div className="flex gap-2">
                            <Button href={`/tasks/${task.id}`} variant="info" className="px-3 py-2 text-xs">عرض</Button>
                            <Button href={`/tasks/${task.id}/edit`} variant="secondary" className="px-3 py-2 text-xs">تعديل</Button>
                            <form action={deleteTask}>
                              <input type="hidden" name="id" value={task.id} />
                              <Button type="submit" variant="danger" className="px-3 py-2 text-xs">حذف</Button>
                            </form>
                          </div>
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
