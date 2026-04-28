"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";

async function syncClerkMetadata(id: string, patch: Record<string, string>) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(id, { publicMetadata: patch });
}

async function revokeAllSessions(id: string) {
  const client = await clerkClient();
  const { data: sessions } = await client.sessions.getSessionList({ userId: id, status: "active" });
  await Promise.all(sessions.map((s) => client.sessions.revokeSession(s.id)));
}

export async function approveUser(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المستخدم مفقود");

  await db.update(profiles).set({ approval_status: "approved", approved_at: new Date() }).where(eq(profiles.id, id));
  await syncClerkMetadata(id, { approval_status: "approved" });
  await revokeAllSessions(id);
  revalidatePath("/admin/users");
}

export async function rejectUser(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المستخدم مفقود");

  await db.update(profiles).set({ approval_status: "rejected" }).where(eq(profiles.id, id));
  await syncClerkMetadata(id, { approval_status: "rejected" });
  revalidatePath("/admin/users");
}

export async function disableUser(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المستخدم مفقود");

  await db.update(profiles).set({ approval_status: "disabled" }).where(eq(profiles.id, id));
  await syncClerkMetadata(id, { approval_status: "disabled" });
  revalidatePath("/admin/users");
}

export async function enableUser(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المستخدم مفقود");

  await db.update(profiles).set({ approval_status: "approved", approved_at: new Date() }).where(eq(profiles.id, id));
  await syncClerkMetadata(id, { approval_status: "approved" });
  await revokeAllSessions(id);
  revalidatePath("/admin/users");
}

export async function makeSuperAdmin(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المستخدم مفقود");

  await db.update(profiles).set({ role: "super_admin" }).where(eq(profiles.id, id));
  await syncClerkMetadata(id, { role: "super_admin" });
  revalidatePath("/admin/users");
}

export async function makeNormalUser(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("معرف المستخدم مفقود");

  await db.update(profiles).set({ role: "user" }).where(eq(profiles.id, id));
  await syncClerkMetadata(id, { role: "user" });
  revalidatePath("/admin/users");
}
