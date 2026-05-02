"use server";

import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function saveTaxRate(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;
  const rate = parseFloat(String(formData.get("tax_rate") || "15"));
  if (isNaN(rate) || rate < 0 || rate > 30) return;
  await db.update(profiles).set({ tax_rate: String(rate) }).where(eq(profiles.id, userId));
  revalidatePath("/prices");
}

export async function saveBackground(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;
  const bg = String(formData.get("background") || "default");
  await db.update(profiles).set({ background_preference: bg }).where(eq(profiles.id, userId));
  revalidatePath("/");
}

export async function updateProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();

  if (!firstName) throw new Error("الاسم الأول مطلوب");

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    firstName,
    lastName: lastName || undefined,
  });

  revalidatePath("/profile");
}
