"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { entities } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function deleteEntity(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف الكيان مفقود");

  await db.delete(entities).where(eq(entities.id, id));
  revalidatePath("/entities");
}
