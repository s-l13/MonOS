"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Menu, Bell } from "lucide-react";

interface Props {
  firstName: string | null;
  isSuperAdmin: boolean;
  unreadCount: number;
  userId: string;
}

export default function MobileNav({ firstName, isSuperAdmin, unreadCount, userId }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
          { href: "/admin/users", label: "إدارة المستخدمين" },
          { href: "/admin/prices", label: "إدارة التسعير" },
        ]
      : []),
  ];

  const financeLinks = [
    { href: "/finance/personal", label: "الشخصية" },
    { href: "/finance/debts", label: "الديون" },
    { href: "/finance/recurring", label: "المدفوعات الدورية" },
    { href: "/finance/projects", label: "مالية المشاريع" },
    { href: "/finance/reports", label: "التقارير" },
  ];

  const fitnessLinks = [
    { href: "/fitness/profile", label: "الملف الرياضي" },
    { href: "/fitness/calories", label: "حاسبة السعرات" },
    { href: "/fitness/workouts", label: "التمارين والجدول" },
    { href: "/fitness/progress", label: "تتبع الوزن" },
    { href: "/fitness/cardio", label: "الكارديو" },
    { href: "/fitness/nutrition", label: "التغذية" },
    { href: "/fitness/reports", label: "التقارير" },
  ];

  return (
    <>
      {/* Fixed top bar — mobile only */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 md:hidden">
        {/* In RTL this renders on the RIGHT — hamburger opens right-side drawer */}
        <button
          onClick={() => setOpen(true)}
          className="p-1 text-gray-400 hover:text-gray-100"
          aria-label="فتح القائمة"
        >
          <Menu className="h-6 w-6" />
        </button>

        <span className="text-lg font-bold text-gray-100">Mon OS</span>

        {/* In RTL this renders on the LEFT — notification bell */}
        <Link href="/notifications" className="relative p-1">
          <Bell className="h-5 w-5 text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer — slides in from right */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 overflow-y-auto border-l border-gray-800 bg-gray-900 transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-100">Mon OS</h2>
            {firstName && (
              <p className="text-xs text-gray-500">مساعد {firstName} الشخصي</p>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-100"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
            >
              {link.label}
            </Link>
          ))}

          {/* Finance */}
          <div className="mt-1">
            <Link
              href="/finance"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
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

          {/* Fitness */}
          <div className="mt-1">
            <Link
              href="/fitness"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
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

          {/* Profile */}
          <Link
            href="/profile"
            className="mt-2 flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 transition hover:bg-gray-700"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {firstName?.charAt(0)?.toUpperCase() ?? "؟"}
            </span>
            <span className="truncate">{firstName ?? "الملف الشخصي"}</span>
          </Link>

          {/* Logout */}
          <Link
            href="/logout"
            className="mt-1 rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
          >
            تسجيل الخروج
          </Link>
        </nav>
      </div>
    </>
  );
}
