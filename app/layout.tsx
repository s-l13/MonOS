import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Tajawal } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ar" dir="rtl" className={tajawal.variable}>
        <body className="bg-gray-950 text-gray-100">{children}</body>
      </html>
    </ClerkProvider>
  );
}
