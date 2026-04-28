import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  approveUser,
  rejectUser,
  disableUser,
  enableUser,
  makeSuperAdmin,
  makeNormalUser,
} from "@/app/admin/users/actions";

type Props = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const { userId } = await auth();
  const params = await searchParams;

  const q = (params.q ?? "").trim();
  const role = (params.role ?? "").trim();
  const status = (params.status ?? "").trim();

  const allProfilesForSummary = await db
    .select({ id: profiles.id, role: profiles.role, approval_status: profiles.approval_status })
    .from(profiles);

  const summary = {
    total: allProfilesForSummary.length,
    approved: allProfilesForSummary.filter((u) => u.approval_status === "approved").length,
    pending: allProfilesForSummary.filter((u) => u.approval_status === "pending").length,
    superAdmins: allProfilesForSummary.filter((u) => u.role === "super_admin").length,
    disabled: allProfilesForSummary.filter((u) => u.approval_status === "disabled").length,
  };

  const users = await db
    .select()
    .from(profiles)
    .where(
      and(
        q ? sql`${profiles.email} ILIKE ${"%" + q + "%"}` : undefined,
        role ? eq(profiles.role, role) : undefined,
        status ? eq(profiles.approval_status, status) : undefined,
      )
    )
    .orderBy(desc(profiles.created_at));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title="إدارة المستخدمين"
            description="مراجعة المستخدمين وتعديل حالة القبول والصلاحيات"
          />

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard title="إجمالي المستخدمين" value={summary.total} />
            <SummaryCard title="المعتمدون" value={summary.approved} />
            <SummaryCard title="قيد المراجعة" value={summary.pending} />
            <SummaryCard title="السوبر أدمن" value={summary.superAdmins} />
            <SummaryCard title="المعطلون" value={summary.disabled} />
          </section>

          <Card className="mb-6">
            <form method="get" className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-300">بحث بالبريد الإلكتروني</label>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="ابحث بالبريد"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الدور</label>
                <select
                  name="role"
                  defaultValue={role}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">الكل</option>
                  <option value="user">مستخدم</option>
                  <option value="super_admin">سوبر أدمن</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">حالة الاعتماد</label>
                <select
                  name="status"
                  defaultValue={status}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">الكل</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="approved">معتمد</option>
                  <option value="rejected">مرفوض</option>
                  <option value="disabled">معطل</option>
                </select>
              </div>

              <div className="md:col-span-4 flex gap-3">
                <Button type="submit">تطبيق الفلاتر</Button>
                <Button href="/admin/users" variant="secondary">إعادة تعيين</Button>
              </div>
            </form>
          </Card>

          <Card>
            {users.length === 0 ? (
              <p className="text-gray-400">لا يوجد مستخدمون مطابقون.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-700 text-sm text-gray-500">
                      <th className="px-3 py-3">البريد</th>
                      <th className="px-3 py-3">الدور</th>
                      <th className="px-3 py-3">الحالة</th>
                      <th className="px-3 py-3">تاريخ الإنشاء</th>
                      <th className="px-3 py-3">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="border-b border-gray-800 text-sm">
                        <td className="px-3 py-4 text-gray-200">{userItem.email ?? "-"}</td>
                        <td className="px-3 py-4">
                          <StatusBadge status={userItem.role} />
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge status={userItem.approval_status} />
                        </td>
                        <td className="px-3 py-4 text-gray-400">
                          {userItem.created_at.toISOString().slice(0, 10)}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            {userItem.id !== userId ? (
                              <>
                                <form action={approveUser}>
                                  <input type="hidden" name="id" value={userItem.id} />
                                  <Button type="submit" variant="info" className="px-3 py-2 text-xs">اعتماد</Button>
                                </form>

                                <form action={rejectUser}>
                                  <input type="hidden" name="id" value={userItem.id} />
                                  <Button type="submit" variant="danger" className="px-3 py-2 text-xs">رفض</Button>
                                </form>

                                {userItem.approval_status === "disabled" ? (
                                  <form action={enableUser}>
                                    <input type="hidden" name="id" value={userItem.id} />
                                    <Button type="submit" variant="info" className="px-3 py-2 text-xs">إعادة تفعيل</Button>
                                  </form>
                                ) : (
                                  <form action={disableUser}>
                                    <input type="hidden" name="id" value={userItem.id} />
                                    <Button type="submit" variant="danger" className="px-3 py-2 text-xs">تعطيل</Button>
                                  </form>
                                )}

                                {userItem.role === "super_admin" ? (
                                  <form action={makeNormalUser}>
                                    <input type="hidden" name="id" value={userItem.id} />
                                    <Button type="submit" variant="secondary" className="px-3 py-2 text-xs">إزالة السوبر</Button>
                                  </form>
                                ) : (
                                  <form action={makeSuperAdmin}>
                                    <input type="hidden" name="id" value={userItem.id} />
                                    <Button type="submit" variant="secondary" className="px-3 py-2 text-xs">جعله سوبر</Button>
                                  </form>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">لا يمكن تعديل حسابك الحالي</span>
                            )}
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

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="p-6">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-3 text-3xl font-bold text-gray-100">{value}</p>
    </Card>
  );
}
