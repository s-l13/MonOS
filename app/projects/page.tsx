import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { projects, entities } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import StatusBadge from "@/components/ui/status-badge";

export default async function ProjectsPage() {
  const projectList = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      ownership_type: projects.ownership_type,
      capital_amount: projects.capital_amount,
      status: projects.status,
      progress_percent: projects.progress_percent,
      start_date: projects.start_date,
      entityName: entities.name,
    })
    .from(projects)
    .leftJoin(entities, eq(projects.entity_id, entities.id))
    .orderBy(desc(projects.created_at));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title="المشاريع"
            description="عرض وإدارة المشاريع المرتبطة بكياناتك"
            actions={<Button href="/projects/new">إضافة مشروع</Button>}
          />

          <Card>
            {projectList.length === 0 ? (
              <p className="text-gray-400">لا توجد مشاريع حتى الآن.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-700 text-sm text-gray-500">
                      <th className="px-3 py-3">اسم المشروع</th>
                      <th className="px-3 py-3">الكيان</th>
                      <th className="px-3 py-3">نوع الملكية</th>
                      <th className="px-3 py-3">رأس المال</th>
                      <th className="px-3 py-3">الحالة</th>
                      <th className="px-3 py-3">نسبة الإنجاز</th>
                      <th className="px-3 py-3">تاريخ البداية</th>
                      <th className="px-3 py-3">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectList.map((project) => (
                      <tr key={project.id} className="border-b border-gray-800 text-sm">
                        <td className="px-3 py-4 font-medium text-gray-200">{project.name}</td>
                        <td className="px-3 py-4 text-gray-400">{project.entityName ?? "-"}</td>
                        <td className="px-3 py-4 text-gray-400">{translateOwnershipType(project.ownership_type)}</td>
                        <td className="px-3 py-4 text-gray-400">{project.capital_amount ?? 0}</td>
                        <td className="px-3 py-4">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-3 py-4 text-gray-400">{project.progress_percent ?? 0}%</td>
                        <td className="px-3 py-4 text-gray-400">{project.start_date ?? "-"}</td>
                        <td className="px-3 py-4">
                          <Button href={`/projects/${project.id}/edit`} variant="secondary" className="px-3 py-2 text-xs">
                            تعديل
                          </Button>
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

function translateOwnershipType(type: string) {
  switch (type) {
    case "sole": return "ملكية فردية";
    case "partnership": return "شراكة";
    default: return type;
  }
}
