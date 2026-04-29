"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function updateTask(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const taskType = String(formData.get("task_type") || "").trim();
  const contextLabel = String(formData.get("context_label") || "").trim();
  const entityId = String(formData.get("entity_id") || "").trim();
  const projectId = String(formData.get("project_id") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priority = String(formData.get("priority") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const progressPercent = Number(formData.get("progress_percent") || 0);
  const startDate = String(formData.get("start_date") || "").trim();
  const dueDate = String(formData.get("due_date") || "").trim();
  const dueTime = String(formData.get("due_time") || "").trim();
  const isAllDay = formData.get("is_all_day") === "on";
  const recurrenceRule = String(formData.get("recurrence_rule") || "").trim();
  const syncToCalendar = formData.get("sync_to_calendar") === "on";
  const remindOneWeek = formData.get("remind_one_week") === "on";
  const remindOneDay = formData.get("remind_one_day") === "on";
  const notes = String(formData.get("notes") || "").trim();

  if (!id) throw new Error("معرف المهمة مفقود");
  if (!title) throw new Error("عنوان المهمة مطلوب");

  const safeProgress = Number.isNaN(progressPercent) ? 0 : Math.max(0, Math.min(100, progressPercent));

  await db.update(tasks).set({
    title,
    task_type: taskType || "personal",
    context_label: contextLabel || null,
    entity_id: entityId || null,
    project_id: projectId || null,
    description: description || null,
    priority: priority || "medium",
    status: status || "new",
    progress_percent: safeProgress,
    start_date: startDate || null,
    due_date: dueDate || null,
    due_time: dueTime || null,
    is_all_day: isAllDay,
    recurrence_rule: recurrenceRule || null,
    sync_to_calendar: syncToCalendar,
    remind_one_week: remindOneWeek,
    remind_one_day: remindOneDay,
    notes: notes || null,
  }).where(and(eq(tasks.id, id), eq(tasks.user_id, userId)));

  revalidatePath("/tasks");
  redirect("/tasks");
}
