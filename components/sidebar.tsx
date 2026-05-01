import Link from "next/link";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";

export default async function Sidebar() {
  const { userId, sessionClaims } = await auth();
  const metadata = (sessionClaims?.metadata ?? {}) as { role?: string };
  const isSuperAdmin = metadata.role === "super_admin";

  let subtitle = "لوحتك التشغيلية";
  let clerkFirstName: string | null = null;
  if (userId) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    clerkFirstName = clerkUser.firstName ?? null;
    if (clerkFirstName) {
      subtitle = `لوحة ${clerkFirstName} التشغيلية`;
    }
  }

  const unreadCount = userId
    ? await db
        .select({ count: count() })
        .from(notifications)
        .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)))
        .then(([row]) => row.count)
    : 0;

  const links = [
    { href: "/", label: "لوحة التحكم" },
    { href: "/entities", label: "الكيانات" },
    { href: "/entities/new", label: "إضافة كيان" },
    { href: "/projects", label: "المشاريع" },
    { href: "/projects/new", label: "إضافة مشروع" },
    { href: "/tasks", label: "المهام" },
    { href: "/assigned-to-me", label: "المهام الموكلة إليّ" },
    { href: "/prices", label: "مقارنة الأسعار" },
    { href: "/prices/session", label: "جلسة تسوق" },
    ...(isSuperAdmin
      ? [
          { href: "/admin/users",   label: "إدارة المستخدمين" },
          { href: "/admin/prices",  label: "إدارة التسعير" },
        ]
      : []),
    { href: "/logout", label: "تسجيل الخروج" },
  ];

  const financeLinks = [
    { href: "/finance/personal",  label: "الشخصية" },
    { href: "/finance/debts",     label: "الديون" },
    { href: "/finance/recurring", label: "المدفوعات الدورية" },
    { href: "/finance/projects",  label: "مالية المشاريع" },
    { href: "/finance/reports",   label: "التقارير" },
  ];

  const fitnessLinks = [
    { href: "/fitness/profile",   label: "الملف الرياضي" },
    { href: "/fitness/calories",  label: "حاسبة السعرات" },
    { href: "/fitness/exercises", label: "مكتبة التمارين" },
    { href: "/fitness/workouts",  label: "جدول التمارين" },
    { href: "/fitness/progress",  label: "تتبع الوزن" },
    { href: "/fitness/cardio",    label: "الكارديو" },
    { href: "/fitness/nutrition", label: "التغذية" },
    { href: "/fitness/reports",   label: "التقارير" },
  ];

  return (
    <aside className="w-full border-b border-gray-800 bg-gray-900 p-4 md:w-64 md:min-h-screen md:border-b-0 md:border-l md:border-l-gray-800">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Mon OS</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <Link href="/notifications" className="relative shrink-0 block transition hover:opacity-80">
          <Bell className="h-5 w-5 text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      <nav className="flex flex-col gap-1">
        {links.slice(0, -1).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
          >
            {link.label}
          </Link>
        ))}

        {/* Finance section */}
        <div className="mt-1">
          <Link
            href="/finance"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-gray-100 block"
          >
            المالية
          </Link>
          <div className="mr-3 mt-0.5 border-r border-gray-700/60 pr-2">
            {financeLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Fitness section */}
        <div className="mt-1">
          <Link
            href="/fitness"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-gray-100 block"
          >
            الصحة والرياضة
          </Link>
          <div className="mr-3 mt-0.5 border-r border-gray-700/60 pr-2">
            {fitnessLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Profile link */}
        {userId && (
          <Link
            href="/profile"
            className="mt-2 flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 transition hover:bg-gray-700"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {clerkFirstName?.charAt(0)?.toUpperCase() ?? "؟"}
            </span>
            <span className="truncate">{clerkFirstName ?? "الملف الشخصي"}</span>
          </Link>
        )}

        {/* Logout — always last */}
        <Link
          href="/logout"
          className="mt-1 rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
        >
          تسجيل الخروج
        </Link>
      </nav>
    </aside>
  );
}
