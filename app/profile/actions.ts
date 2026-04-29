"use server";

import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";

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
