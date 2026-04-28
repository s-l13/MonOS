"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const entityId = String(formData.get("entity_id") || "").trim();
  const ownershipType = String(formData.get("ownership_type") || "").trim();
  const capitalAmount = Number(formData.get("capital_amount") || 0);
  const status = String(formData.get("status") || "").trim();
  const progressPercent = Number(formData.get("progress_percent") || 0);
  const startDateRaw = String(formData.get("start_date") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) throw new Error("اسم المشروع مطلوب");
  if (!entityId) throw new Error("يجب اختيار الكيان");

  await db.insert(projects).values({
    name,
    entity_id: entityId,
    ownership_type: ownershipType || "sole",
    capital_amount: String(Number.isNaN(capitalAmount) ? 0 : capitalAmount),
    status: status || "planning",
    progress_percent: Number.isNaN(progressPercent) ? 0 : progressPercent,
    start_date: startDateRaw || null,
    description: description || null,
    notes: notes || null,
  });

  revalidatePath("/projects");
  redirect("/projects");
}
