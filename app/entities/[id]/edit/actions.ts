"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { entities } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function updateEntity(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const entityType = String(formData.get("entity_type") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!id) throw new Error("معرف الكيان مفقود");
  if (!name) throw new Error("اسم الكيان مطلوب");

  await db.update(entities).set({
    name,
    entity_type: entityType,
    status,
    description: description || null,
  }).where(eq(entities.id, id));

  revalidatePath("/entities");
  redirect("/entities");
}
