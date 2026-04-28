import Sidebar from "@/components/sidebar";
import { db } from "@/lib/db";
import { entities } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { updateEntity } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEntityPage({ params }: Props) {
  const { id } = await params;

  const [entity] = await db.select().from(entities).where(eq(entities.id, id));

  if (!entity) {
    return (
      <div className="min-h-screen md:flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10">
          <p className="text-red-400">تعذر العثور على الكيان.</p>
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
            <h1 className="text-3xl font-bold text-gray-100">تعديل الكيان</h1>
            <p className="mt-2 text-gray-400">تعديل بيانات الكيان الحالي</p>
          </header>

          <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            <form action={updateEntity} className="grid gap-5">
              <input type="hidden" name="id" value={entity.id} />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">اسم الكيان</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={entity.name}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">نوع الكيان</label>
                <select
                  name="entity_type"
                  defaultValue={entity.entity_type}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="sole">ملكية فردية</option>
                  <option value="partnership">شراكة</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الحالة</label>
                <select
                  name="status"
                  defaultValue={entity.status}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="setup">تحت التأسيس</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الوصف</label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={entity.description ?? ""}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <a href="/entities" className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800">
                  إلغاء
                </a>
                <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700">
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
