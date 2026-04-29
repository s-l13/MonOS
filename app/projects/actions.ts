"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المشروع مفقود");

  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/projects");
}
