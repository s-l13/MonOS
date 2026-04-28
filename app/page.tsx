import type { ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { entities, projects, tasks, partners } from "@/lib/schema";
import { count, desc } from "drizzle-orm";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import TaskStatusChart from "@/components/ui/task-status-chart";
import { Building2, FolderKanban, CheckSquare, Users } from "lucide-react";

export default async function Home() {
  const [
    [entityCount],
    [projectCount],
    [taskCount],
    [partnerCount],
    latestTasks,
    allTasks,
  ] = await Promise.all([
    db.select({ count: count() }).from(entities),
    db.select({ count: count() }).from(projects),
    db.select({ count: count() }).from(tasks),
    db.select({ count: count() }).from(partners),
    db.select({
      id: tasks.id,
      title: tasks.title,
      task_type: tasks.task_type,
      context_label: tasks.context_label,
      priority: tasks.priority,
      status: tasks.status,
      due_date: tasks.due_date,
      progress_percent: tasks.progress_percent,
    }).from(tasks).orderBy(desc(tasks.created_at)).limit(5),
    db.select({ id: tasks.id, status: tasks.status, progress_percent: tasks.progress_percent }).from(tasks),
  ]);

  const counts = {
    entities: entityCount.count,
    projects: projectCount.count,
    tasks: taskCount.count,
    partners: partnerCount.count,
  };

  const statusCounts = { new: 0, in_progress: 0, completed: 0, late: 0, postponed: 0 };

  for (const task of allTasks) {
    if (task.status in statusCounts) {
      statusCounts[task.status as keyof typeof statusCounts] += 1;
    }
  }

  const averageProgress =
    allTasks.length > 0
      ? Math.round(allTasks.reduce((sum, t) => sum + (t.progress_percent ?? 0), 0) / allTasks.length)
      : 0;

  const completedTasks = statusCounts.completed;
  const activeTasks = statusCounts.in_progress;
  const lateTasks = statusCounts.late;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 bg-gray-950 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title="لوحة التحكم"
            description="نظرة شاملة على أعمالك ومشاريعك ومهامك الحالية"
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="الكيانات" value={counts.entities} href="/entities" icon={<Building2 className="h-5 w-5" />} accent="bg-blue-900/40 text-blue-400" />
            <StatCard title="المشاريع" value={counts.projects} href="/projects" icon={<FolderKanban className="h-5 w-5" />} accent="bg-violet-900/40 text-violet-400" />
            <StatCard title="المهام" value={counts.tasks} href="/tasks" icon={<CheckSquare className="h-5 w-5" />} accent="bg-amber-900/40 text-amber-400" />
            <StatCard title="الشركاء" value={counts.partners} icon={<Users className="h-5 w-5" />} accent="bg-green-900/40 text-green-400" />
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card>
              <p className="text-sm text-gray-400">متوسط الإنجاز العام</p>
              <p className="mt-3 text-4xl font-bold text-gray-100">{averageProgress}%</p>
              <div className="mt-4 h-3 w-full rounded-full bg-gray-800">
                <div className="h-3 rounded-full bg-blue-600" style={{ width: `${averageProgress}%` }} />
              </div>
            </Card>

            <Card>
              <p className="text-sm text-gray-400">المهام المكتملة</p>
              <p className="mt-3 text-4xl font-bold text-gray-100">{completedTasks}</p>
              <p className="mt-2 text-sm text-gray-400">مجموع المهام التي اكتمل تنفيذها</p>
            </Card>

            <Card>
              <p className="text-sm text-gray-400">المهام النشطة / المتأخرة</p>
              <p className="mt-3 text-4xl font-bold text-gray-100">{activeTasks} / {lateTasks}</p>
              <p className="mt-2 text-sm text-gray-400">قيد التنفيذ مقابل المتأخرة</p>
            </Card>
          </section>

          <section className="mt-8">
            <Card>
              <h2 className="mb-1 text-xl font-semibold text-gray-100">توزيع حالات المهام</h2>
              <p className="mb-4 text-sm text-gray-400">إجمالي المهام: {counts.tasks}</p>
              <TaskStatusChart counts={statusCounts} />
            </Card>
          </section>

          <section className="mt-8">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-100">آخر المهام</h2>
                <Button href="/tasks" variant="secondary">عرض الكل</Button>
              </div>

              {latestTasks.length === 0 ? (
                <p className="text-gray-400">لا توجد مهام حتى الآن.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right">
                    <thead>
                      <tr className="border-b border-gray-700 text-sm text-gray-500">
                        <th className="px-3 py-3">العنوان</th>
                        <th className="px-3 py-3">النوع</th>
                        <th className="px-3 py-3">السياق</th>
                        <th className="px-3 py-3">الأولوية</th>
                        <th className="px-3 py-3">الحالة</th>
                        <th className="px-3 py-3">الإنجاز</th>
                        <th className="px-3 py-3">الاستحقاق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestTasks.map((task) => (
                        <tr key={task.id} className="border-b border-gray-800 text-sm">
                          <td className="px-3 py-4 font-medium text-gray-200">{task.title}</td>
                          <td className="px-3 py-4 text-gray-400">{translateTaskType(task.task_type)}</td>
                          <td className="px-3 py-4 text-gray-400">{task.context_label ?? "-"}</td>
                          <td className="px-3 py-4 text-gray-400">{translatePriority(task.priority)}</td>
                          <td className="px-3 py-4 text-gray-400">{translateStatus(task.status)}</td>
                          <td className="px-3 py-4 text-gray-400">{task.progress_percent ?? 0}%</td>
                          <td className="px-3 py-4 text-gray-400">{task.due_date ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, href, icon, accent }: { title: string; value: number; href?: string; icon: ReactNode; accent: string }) {
  const inner = (
    <Card className="p-6 transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <span className={`rounded-lg p-2 ${accent}`}>{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-gray-100">{value}</p>
    </Card>
  );
  if (href) return <a href={href}>{inner}</a>;
  return inner;
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
