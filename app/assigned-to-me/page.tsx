import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import StatusBadge from "@/components/ui/status-badge";
import Button from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { taskAssignments, tasks, profiles } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { updateAssignmentStatus } from "@/app/tasks/assignment-actions";

export default async function AssignedToMePage() {
  const { userId } = await auth();
  if (!userId) return null;

  const assignmentList = await db
    .select({
      id:                taskAssignments.id,
      task_id:           taskAssignments.task_id,
      assigned_to_email: taskAssignments.assigned_to_email,
      comment:           taskAssignments.comment,
      status:            taskAssignments.status,
      created_at:        taskAssignments.created_at,
      taskTitle:         tasks.title,
      assignerEmail:     profiles.email,
    })
    .from(taskAssignments)
    .leftJoin(tasks,    eq(taskAssignments.task_id,     tasks.id))
    .leftJoin(profiles, eq(taskAssignments.assigned_by, profiles.id))
    .where(eq(taskAssignments.assigned_to, userId))
    .orderBy(desc(taskAssignments.created_at));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title="المهام الموكلة إليّ"
            description="جميع المهام التي أسندها إليك أعضاء الفريق"
          />

          <Card>
            {assignmentList.length === 0 ? (
              <p className="text-gray-400">لا توجد مهام موكلة إليك حتى الآن.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-700 text-sm text-gray-500">
                      <th className="px-3 py-3">المهمة</th>
                      <th className="px-3 py-3">أُسندت من</th>
                      <th className="px-3 py-3">تعليق</th>
                      <th className="px-3 py-3">الحالة</th>
                      <th className="px-3 py-3">التاريخ</th>
                      <th className="px-3 py-3">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentList.map((row) => (
                      <tr key={row.id} className="border-b border-gray-800 text-sm">

                        {/* Task title — links to task detail */}
                        <td className="px-3 py-4">
                          {row.task_id ? (
                            <a
                              href={`/tasks/${row.task_id}`}
                              className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              {row.taskTitle ?? "—"}
                            </a>
                          ) : (
                            <span className="text-gray-400">{row.taskTitle ?? "—"}</span>
                          )}
                        </td>

                        <td className="px-3 py-4 text-gray-400">{row.assignerEmail ?? "—"}</td>

                        <td className="px-3 py-4 text-gray-400 max-w-xs">
                          {row.comment ? (
                            <span className="line-clamp-2">{row.comment}</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <StatusBadge
                            status={row.status}
                            label={translateAssignmentStatus(row.status)}
                          />
                        </td>

                        <td className="px-3 py-4 text-gray-400">
                          {row.created_at.toISOString().slice(0, 10)}
                        </td>

                        {/* Action buttons — contextual per status */}
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            {row.status === "pending" && (
                              <>
                                <StatusForm
                                  action={updateAssignmentStatus}
                                  assignmentId={row.id}
                                  taskId={row.task_id ?? ""}
                                  newStatus="in_progress"
                                  label="قبول"
                                  variant="info"
                                />
                                <StatusForm
                                  action={updateAssignmentStatus}
                                  assignmentId={row.id}
                                  taskId={row.task_id ?? ""}
                                  newStatus="rejected"
                                  label="رفض"
                                  variant="danger"
                                />
                              </>
                            )}
                            {row.status === "in_progress" && (
                              <>
                                <StatusForm
                                  action={updateAssignmentStatus}
                                  assignmentId={row.id}
                                  taskId={row.task_id ?? ""}
                                  newStatus="completed"
                                  label="إتمام"
                                  variant="info"
                                />
                                <StatusForm
                                  action={updateAssignmentStatus}
                                  assignmentId={row.id}
                                  taskId={row.task_id ?? ""}
                                  newStatus="rejected"
                                  label="رفض"
                                  variant="danger"
                                />
                              </>
                            )}
                            {(row.status === "completed" || row.status === "rejected") && (
                              <span className="text-xs text-gray-600">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

// Small wrapper to keep table rows readable
function StatusForm({
  action,
  assignmentId,
  taskId,
  newStatus,
  label,
  variant,
}: {
  action: (f: FormData) => Promise<void>;
  assignmentId: string;
  taskId: string;
  newStatus: string;
  label: string;
  variant: "info" | "danger";
}) {
  return (
    <form action={action}>
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <input type="hidden" name="task_id"       value={taskId} />
      <input type="hidden" name="status"        value={newStatus} />
      <Button type="submit" variant={variant} className="px-3 py-2 text-xs">
        {label}
      </Button>
    </form>
  );
}

function translateAssignmentStatus(status: string) {
  switch (status) {
    case "pending":     return "قيد الانتظار";
    case "in_progress": return "قيد التنفيذ";
    case "completed":   return "مكتملة";
    case "rejected":    return "مرفوضة";
    default:            return status;
  }
}
