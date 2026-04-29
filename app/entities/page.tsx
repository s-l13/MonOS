import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { entities } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import StatusBadge from "@/components/ui/status-badge";
import { deleteEntity } from "./actions";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function EntitiesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const entityList = await db
    .select()
    .from(entities)
    .where(eq(entities.user_id, userId))
    .orderBy(desc(entities.created_at));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title="الكيانات"
            description="إدارة الجهات والأنشطة المرتبطة بك"
            actions={<Button href="/entities/new">إضافة كيان</Button>}
          />

          <Card>
            {entityList.length === 0 ? (
              <p className="text-gray-400">لا توجد كيانات حتى الآن.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-700 text-sm text-gray-500">
                      <th className="px-3 py-3">الاسم</th>
                      <th className="px-3 py-3">النوع</th>
                      <th className="px-3 py-3">الحالة</th>
                      <th className="px-3 py-3">الوصف</th>
                      <th className="px-3 py-3">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entityList.map((entity) => (
                      <tr key={entity.id} className="border-b border-gray-800 text-sm">
                        <td className="px-3 py-4 font-medium text-gray-200">{entity.name}</td>
                        <td className="px-3 py-4 text-gray-400">{translateEntityType(entity.entity_type)}</td>
                        <td className="px-3 py-4">
                          <StatusBadge status={entity.status} />
                        </td>
                        <td className="px-3 py-4 text-gray-400">{entity.description ?? "-"}</td>
                        <td className="px-3 py-4">
                          <div className="flex gap-2">
                            <Button href={`/entities/${entity.id}/edit`} variant="secondary" className="px-3 py-2 text-xs">
                              تعديل
                            </Button>
                            <form action={deleteEntity}>
                              <input type="hidden" name="id" value={entity.id} />
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

function translateEntityType(type: string) {
  switch (type) {
    case "sole": return "ملكية فردية";
    case "partnership": return "شراكة";
    default: return type;
  }
}
