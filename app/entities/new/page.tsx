import Sidebar from "@/components/sidebar";
import { createEntity } from "./actions";

export default function NewEntityPage() {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">إضافة كيان جديد</h1>
            <p className="mt-2 text-gray-400">إنشاء كيان جديد مثل شركة أو نشاط أو مشروع تشغيلي</p>
          </header>

          <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg">
            <form action={createEntity} className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">اسم الكيان</label>
                <input
                  name="name"
                  type="text"
                  placeholder="مثال: عتبة الإبداع"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">نوع الكيان</label>
                <select
                  name="entity_type"
                  defaultValue="sole"
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
                  defaultValue="active"
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
                  placeholder="اكتب وصفًا مختصرًا عن الكيان"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  حفظ الكيان
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
