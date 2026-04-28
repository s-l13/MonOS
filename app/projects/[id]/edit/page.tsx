import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { projects, entities } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { updateProject } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;

  const [[project], entityOptions] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, id)),
    db.select({ id: entities.id, name: entities.name }).from(entities).orderBy(desc(entities.created_at)),
  ]);

  if (!project) {
    return (
      <div className="min-h-screen md:flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10">
          <p className="text-red-400">تعذر العثور على المشروع.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">تعديل المشروع</h1>
            <p className="mt-2 text-gray-400">تعديل بيانات المشروع الحالي</p>
          </header>

          <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            <form action={updateProject} className="grid gap-5">
              <input type="hidden" name="id" value={project.id} />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">اسم المشروع</label>
                <input name="name" type="text" defaultValue={project.name} required className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الكيان</label>
                <select name="entity_id" defaultValue={project.entity_id ?? ""} required className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                  <option value="" disabled>اختر الكيان</option>
                  {entityOptions.map((entity) => (
                    <option key={entity.id} value={entity.id}>{entity.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">نوع الملكية</label>
                <select name="ownership_type" defaultValue={project.ownership_type} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                  <option value="sole">ملكية فردية</option>
                  <option value="partnership">شراكة</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">رأس المال</label>
                <input name="capital_amount" type="number" min="0" step="0.01" defaultValue={project.capital_amount ?? 0} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الحالة</label>
                <select name="status" defaultValue={project.status} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500">
                  <option value="planning">تخطيط</option>
                  <option value="active">نشط</option>
                  <option value="completed">مكتمل</option>
                  <option value="paused">متوقف</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">نسبة الإنجاز</label>
                <input name="progress_percent" type="number" min="0" max="100" defaultValue={project.progress_percent ?? 0} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">تاريخ البداية</label>
                <input name="start_date" type="date" defaultValue={project.start_date ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الوصف</label>
                <textarea name="description" rows={4} defaultValue={project.description ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">ملاحظات</label>
                <textarea name="notes" rows={3} defaultValue={project.notes ?? ""} className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500" />
              </div>

              <div className="flex justify-end gap-3">
                <a href="/projects" className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800">إلغاء</a>
                <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700">حفظ التعديلات</button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
