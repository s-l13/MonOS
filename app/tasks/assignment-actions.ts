"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, tasks, taskAssignments, notifications } from "@/lib/schema";

// ---------------------------------------------------------------------------
// assignTask
// ---------------------------------------------------------------------------
export async function assignTask(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const taskId  = String(formData.get("task_id")  || "").trim();
  const email   = String(formData.get("email")     || "").trim();
  const comment = String(formData.get("comment")   || "").trim() || null;

  if (!taskId || !email) return;

  // Resolve target user — profiles table first, Clerk API as fallback.
  // A user may exist in Clerk but not yet have a profiles row (e.g. webhook
  // delay, or they registered after the webhook was set up).
  let targetId: string | null = null;

  const [profileTarget] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email));

  if (profileTarget) {
    targetId = profileTarget.id;
  } else {
    const client = await clerkClient();
    const { data: clerkUsers } = await client.users.getUserList({ emailAddress: [email] });
    if (clerkUsers && clerkUsers.length > 0) {
      targetId = clerkUsers[0].id;
    }
  }

  if (!targetId) {
    redirect(`/tasks/${taskId}?assign_error=not_found`);
  }

  // Get task title for notification body
  const [task] = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, taskId));

  const taskTitle = task?.title ?? "";

  // Insert assignment
  const [assignment] = await db
    .insert(taskAssignments)
    .values({
      task_id:           taskId,
      assigned_by:       userId,
      assigned_to:       targetId,
      assigned_to_email: email,
      comment,
      status:            "pending",
    })
    .returning();

  // Notify target user
  await db.insert(notifications).values({
    user_id:       targetId,
    type:          "assignment",
    title:         "تم إسناد مهمة إليك",
    body:          `تم إسناد المهمة "${taskTitle}" إليك${comment ? ` — تعليق: ${comment}` : ""}`,
    task_id:       taskId,
    assignment_id: assignment.id,
    is_read:       false,
  });

  // Send email (optional — skipped when RESEND_API_KEY is not configured)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "Mon OS <noreply@resend.dev>",
        to:      [email],
        subject: `مهمة جديدة موكلة إليك: ${taskTitle}`,
        html: [
          `<div dir="rtl" style="font-family:Arial,sans-serif">`,
          `<p>مرحباً،</p>`,
          `<p>تم إسناد المهمة <strong>${taskTitle}</strong> إليك.</p>`,
          comment ? `<p>تعليق: ${comment}</p>` : "",
          `</div>`,
        ].join(""),
      }),
    }).catch(() => {
      // Non-fatal — email failure must not break the assignment
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/assigned-to-me");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// updateAssignmentStatus
// ---------------------------------------------------------------------------
export async function updateAssignmentStatus(formData: FormData) {
  const assignmentId = String(formData.get("assignment_id") || "").trim();
  const taskId       = String(formData.get("task_id")       || "").trim();
  const newStatus    = String(formData.get("status")        || "").trim();

  if (!assignmentId || !taskId || !newStatus) return;

  const [updated] = await db
    .update(taskAssignments)
    .set({ status: newStatus })
    .where(eq(taskAssignments.id, assignmentId))
    .returning();

  if (updated) {
    const [task] = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, taskId));

    await db.insert(notifications).values({
      user_id:       updated.assigned_by,
      type:          "assignment_update",
      title:         "تم تحديث حالة إسناد مهمة",
      body:          `قام المُسنَد إليه بتحديث حالة المهمة "${task?.title ?? ""}" إلى ${translateStatus(newStatus)}`,
      task_id:       taskId,
      assignment_id: assignmentId,
      is_read:       false,
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/assigned-to-me");
}

// ---------------------------------------------------------------------------
// markNotificationRead
// ---------------------------------------------------------------------------
export async function markNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notification_id") || "").trim();
  if (!notificationId) return;

  await db
    .update(notifications)
    .set({ is_read: true })
    .where(eq(notifications.id, notificationId));

  revalidatePath("/notifications");
  revalidatePath("/");
  revalidatePath("/assigned-to-me");
}

// ---------------------------------------------------------------------------
// markAllNotificationsRead
// ---------------------------------------------------------------------------
export async function markAllNotificationsRead() {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .update(notifications)
    .set({ is_read: true })
    .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)));

  revalidatePath("/notifications");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function translateStatus(status: string) {
  switch (status) {
    case "pending":     return "قيد الانتظار";
    case "in_progress": return "قيد التنفيذ";
    case "completed":   return "مكتملة";
    case "rejected":    return "مرفوضة";
    default:            return status;
  }
}
