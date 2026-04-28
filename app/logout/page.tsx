"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    signOut().then(() => router.replace("/login"));
  }, [signOut, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <p className="text-gray-400">جاري تسجيل الخروج...</p>
    </main>
  );
}
