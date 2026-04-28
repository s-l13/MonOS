"use server";

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  // Verify signature — verifyWebhook reads CLERK_WEBHOOK_SIGNING_SECRET automatically
  let evt;
  try {
    evt = await verifyWebhook(request);
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  const eventType = evt.type;

  // ----------------------------------------------------------------
  // user.created — insert profile row + seed Clerk publicMetadata
  // ----------------------------------------------------------------
  if (eventType === "user.created") {
    const { id, email_addresses, primary_email_address_id } = evt.data;

    const primaryEmail =
      email_addresses.find((e) => e.id === primary_email_address_id)
        ?.email_address ?? null;

    await db.insert(profiles).values({
      id,
      email:           primaryEmail,
      role:            "user",
      approval_status: "pending",
    });

    // Write the initial approval state into Clerk's JWT so proxy.ts can
    // read it without a DB round-trip on every request.
    const client = await clerkClient();
    await client.users.updateUserMetadata(id, {
      publicMetadata: {
        role:            "user",
        approval_status: "pending",
      },
    });

    return new Response("User profile created", { status: 201 });
  }

  // ----------------------------------------------------------------
  // user.deleted — remove profile row
  // ----------------------------------------------------------------
  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await db.delete(profiles).where(eq(profiles.id, id));
    }
    return new Response("User profile deleted", { status: 200 });
  }

  // All other event types — acknowledge and ignore
  return new Response("Event received", { status: 200 });
}
