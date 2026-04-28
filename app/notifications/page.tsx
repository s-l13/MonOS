import Sidebar from "@/components/sidebar";
import PageHeader from "@/components/ui/page-header";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { markNotificationRead, markAllNotificationsRead } from "@/app/tasks/assignment-actions";

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const notificationList = await db
    .select()
    .from(notifications)
    .where(eq(notifications.user_id, userId))
    .orderBy(desc(notifications.created_at));

  const unreadCount = notificationList.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">الإشعارات</h1>
              <p className="mt-2 text-gray-400">
                {unreadCount > 0
                  ? `لديك ${unreadCount} إشعار غير مقروء`
                  : "جميع الإشعارات مقروءة"}
              </p>
            </div>

            {unreadCount > 0 && (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-600"
                >
                  تعليم الكل كمقروء
                </button>
              </form>
            )}
          </div>

          {notificationList.length === 0 ? (
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-10 text-center">
              <p className="text-gray-400">لا توجد إشعارات بعد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificationList.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-5 transition ${
                    n.is_read
                      ? "border-gray-800 bg-gray-900"
                      : "border-blue-800 bg-gray-900 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Unread dot */}
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.is_read ? "bg-transparent" : "bg-blue-500"
                        }`}
                      />

                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${n.is_read ? "text-gray-300" : "text-gray-100"}`}>
                          {n.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">{n.body}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {n.created_at.toISOString().slice(0, 16).replace("T", " — ")}
                          </span>

                          {n.task_id && (
                            <a
                              href={`/tasks/${n.task_id}`}
                              className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              عرض المهمة ←
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mark as read button — only shown while unread */}
                    {!n.is_read && (
                      <form action={markNotificationRead} className="shrink-0">
                        <input type="hidden" name="notification_id" value={n.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-700 hover:text-gray-200"
                        >
                          تعليم كمقروء
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
