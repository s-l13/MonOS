import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await db.update(profiles).set({ approval_status: "rejected" }).where(eq(profiles.id, id));

  const client = await clerkClient();
  await client.users.updateUserMetadata(id, { publicMetadata: { approval_status: "rejected" } });

  return NextResponse.redirect(new URL("/admin/users", _request.url));
}
