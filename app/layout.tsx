import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Tajawal } from "next/font/google";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { profiles, notifications } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";
import MobileNav from "@/components/MobileNav";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Executive OS",
  description: "Personal executive management system for Engineer Sultan",
};

// Map stored IDs → CSS background values (must match BackgroundPicker)
const BG_VALUES: Record<string, string> = {
  default:     "#0a0a0f",
  midnight:    "#0d1117",
  navy:        "#0a0f1f",
  forest:      "#0a1a0f",
  purple:      "#0f0a1f",
  charcoal:    "#1a1a1a",
  wine:        "#1a0a0f",
  teal:        "#0a1a1a",
  grad_blue:   "linear-gradient(135deg, #0a0a0f 0%, #0a0f2a 100%)",
  grad_green:  "linear-gradient(135deg, #0a0a0f 0%, #0a1f0a 100%)",
  grad_purple: "linear-gradient(135deg, #0a0a0f 0%, #1a0a2f 100%)",
  grad_warm:   "linear-gradient(135deg, #0f0a0a 0%, #1f0f0a 100%)",
  grad_teal:   "linear-gradient(135deg, #0a0a0f 0%, #0a1f1f 100%)",
  grad_gold:   "linear-gradient(135deg, #0f0a00 0%, #1f1500 100%)",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId, sessionClaims } = await auth();
  const metadata = (sessionClaims?.metadata ?? {}) as { role?: string };
  const isSuperAdmin = metadata.role === "super_admin";

  let bgStyle = BG_VALUES.default;
  let firstName: string | null = null;
  let unreadCount = 0;

  if (userId) {
    const client = await clerkClient();
    const [profRows, clerkUser, countRows] = await Promise.all([
      db.select({ bg: profiles.background_preference }).from(profiles).where(eq(profiles.id, userId)),
      client.users.getUser(userId),
      db.select({ count: count() }).from(notifications)
        .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false))),
    ]);

    const prof = profRows[0] ?? null;
    if (prof?.bg && prof.bg !== "default" && BG_VALUES[prof.bg]) {
      bgStyle = BG_VALUES[prof.bg];
    }
    firstName = clerkUser.firstName ?? null;
    unreadCount = countRows[0].count;
  }

  return (
    <ClerkProvider>
      <html lang="ar" dir="rtl" className={tajawal.variable}>
        <body style={{ background: bgStyle }} className="text-gray-100">
          {userId && (
            <MobileNav
              firstName={firstName}
              isSuperAdmin={isSuperAdmin}
              unreadCount={unreadCount}
              userId={userId}
            />
          )}
          <div className={userId ? "pt-14 md:pt-0" : undefined}>
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
