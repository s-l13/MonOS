"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { entities } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function deleteEntity(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف الكيان مفقود");

  await db.delete(entities).where(and(eq(entities.id, id), eq(entities.user_id, userId)));
  revalidatePath("/entities");
}
