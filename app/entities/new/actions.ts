"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { entities } from "@/lib/schema";
import { auth } from "@clerk/nextjs/server";

export async function createEntity(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const name = String(formData.get("name") || "").trim();
  const entityType = String(formData.get("entity_type") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) throw new Error("اسم الكيان مطلوب");

  await db.insert(entities).values({
    user_id: userId,
    name,
    entity_type: entityType || "sole",
    status: status || "active",
    description: description || null,
  });

  revalidatePath("/entities");
  redirect("/entities");
}
