"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function deleteProject(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المشروع مفقود");

  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.user_id, userId)));
  revalidatePath("/projects");
}
