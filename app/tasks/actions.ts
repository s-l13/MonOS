"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المهمة مفقود");

  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/tasks");
}
