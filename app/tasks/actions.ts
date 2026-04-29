"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function deleteTask(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المهمة مفقود");

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.user_id, userId)));
  revalidatePath("/tasks");
}
