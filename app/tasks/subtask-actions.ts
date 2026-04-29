"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tasks, taskSubtasks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

async function syncTaskProgress(taskId: string) {
  const subtasks = await db
    .select({ id: taskSubtasks.id, is_completed: taskSubtasks.is_completed })
    .from(taskSubtasks)
    .where(eq(taskSubtasks.task_id, taskId));

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.is_completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  let status = "new";
  if (progress === 100) status = "completed";
  else if (progress > 0) status = "in_progress";

  await db.update(tasks).set({ progress_percent: progress, status }).where(eq(tasks.id, taskId));
}

export async function createSubtask(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const taskId = String(formData.get("task_id") || "").trim();
  const title = String(formData.get("title") || "").trim();

  if (!taskId) throw new Error("معرف المهمة مفقود");
  if (!title) throw new Error("عنوان المهمة الفرعية مطلوب");

  await db.insert(taskSubtasks).values({ user_id: userId, task_id: taskId, title });
  await syncTaskProgress(taskId);

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/tasks/${taskId}/edit`);
}

export async function toggleSubtaskStatus(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const subtaskId = String(formData.get("subtask_id") || "").trim();
  const taskId = String(formData.get("task_id") || "").trim();
  const currentValue = String(formData.get("current_value") || "").trim();

  if (!subtaskId || !taskId) throw new Error("بيانات المهمة الفرعية غير مكتملة");

  await db.update(taskSubtasks).set({ is_completed: currentValue !== "true" }).where(and(eq(taskSubtasks.id, subtaskId), eq(taskSubtasks.user_id, userId)));
  await syncTaskProgress(taskId);

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/tasks/${taskId}/edit`);
}

export async function deleteSubtask(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("غير مصرح");

  const subtaskId = String(formData.get("subtask_id") || "").trim();
  const taskId = String(formData.get("task_id") || "").trim();

  if (!subtaskId || !taskId) throw new Error("بيانات الحذف غير مكتملة");

  await db.delete(taskSubtasks).where(and(eq(taskSubtasks.id, subtaskId), eq(taskSubtasks.user_id, userId)));
  await syncTaskProgress(taskId);

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/tasks/${taskId}/edit`);
}
