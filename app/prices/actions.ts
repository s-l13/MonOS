"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceProducts, priceEntries, profiles, shoppingSessions } from "@/lib/schema";

export async function createProduct(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const name     = String(formData.get("name")     || "").trim();
  const category = String(formData.get("category") || "other").trim();
  const unit     = String(formData.get("unit")     || "piece").trim();
  const notes    = String(formData.get("notes")    || "").trim() || null;

  if (!name) return;

  await db.insert(priceProducts).values({ created_by: userId, name, category, unit, notes });
  revalidatePath("/prices");
}

export async function deleteProduct(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await db
    .delete(priceProducts)
    .where(and(eq(priceProducts.id, id), eq(priceProducts.created_by, userId)));

  revalidatePath("/prices");
}

export async function addPriceEntry(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (profile?.prices_banned) throw new Error("تم إيقاف صلاحيتك في التسعير");

  const product_id    = String(formData.get("product_id")    || "").trim();
  const store_name    = String(formData.get("store_name")    || "").trim();
  const city          = String(formData.get("city")          || "").trim() || null;
  const price         = String(formData.get("price")         || "").trim();
  const quantity      = String(formData.get("quantity")      || "1").trim();
  const purchase_date = String(formData.get("purchase_date") || "").trim();
  const notes         = String(formData.get("notes")         || "").trim() || null;
  const includes_tax  = formData.get("includes_tax") === "on";

  if (!product_id || !store_name || !price || !purchase_date) return;

  const unit_price = (Number(price) / Number(quantity)).toFixed(2);

  await db.insert(priceEntries).values({
    user_id: userId, product_id, store_name, city, price, quantity,
    unit_price, purchase_date, includes_tax, notes,
  });

  revalidatePath("/prices");
  revalidatePath("/prices/" + product_id);
}

export async function deletePriceEntry(formData: FormData) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return;

  const isSuperAdmin = (sessionClaims?.metadata as { role?: string })?.role === "super_admin";
  const id         = String(formData.get("id")         || "").trim();
  const product_id = String(formData.get("product_id") || "").trim();
  if (!id) return;

  if (isSuperAdmin) {
    await db.delete(priceEntries).where(eq(priceEntries.id, id));
  } else {
    await db
      .delete(priceEntries)
      .where(and(eq(priceEntries.id, id), eq(priceEntries.user_id, userId)));
  }

  revalidatePath("/prices");
  revalidatePath("/prices/session");
  revalidatePath("/admin/prices");
  if (product_id) revalidatePath("/prices/" + product_id);
}

export async function banUserFromPricing(formData: FormData) {
  const { sessionClaims } = await auth();
  const isSuperAdmin = (sessionClaims?.metadata as { role?: string })?.role === "super_admin";
  if (!isSuperAdmin) return;

  const targetUserId = String(formData.get("user_id") || "").trim();
  if (!targetUserId) return;

  await db.update(profiles).set({ prices_banned: true }).where(eq(profiles.id, targetUserId));
  revalidatePath("/admin/prices");
}

export async function unbanUserFromPricing(formData: FormData) {
  const { sessionClaims } = await auth();
  const isSuperAdmin = (sessionClaims?.metadata as { role?: string })?.role === "super_admin";
  if (!isSuperAdmin) return;

  const targetUserId = String(formData.get("user_id") || "").trim();
  if (!targetUserId) return;

  await db.update(profiles).set({ prices_banned: false }).where(eq(profiles.id, targetUserId));
  revalidatePath("/admin/prices");
}

// ---------------------------------------------------------------------------
// Shopping sessions
// ---------------------------------------------------------------------------

export async function createShoppingSession(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const store_name   = String(formData.get("store_name")   || "").trim();
  const city         = String(formData.get("city")         || "").trim() || null;
  const session_date = String(formData.get("session_date") || "").trim();
  const notes        = String(formData.get("notes")        || "").trim() || null;

  if (!store_name || !session_date) return;

  await db.insert(shoppingSessions).values({ user_id: userId, store_name, city, session_date, notes });
  revalidatePath("/prices/session");
}

export async function endShoppingSession(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await db
    .update(shoppingSessions)
    .set({ is_active: false })
    .where(and(eq(shoppingSessions.id, id), eq(shoppingSessions.user_id, userId)));

  revalidatePath("/prices/session");
}

export async function addPriceEntryFromSession(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (profile?.prices_banned) throw new Error("تم إيقاف صلاحيتك في التسعير");

  const session_id   = String(formData.get("session_id")  || "").trim();
  const product_id   = String(formData.get("product_id")  || "").trim();
  const price        = String(formData.get("price")       || "").trim();
  const quantity     = String(formData.get("quantity")    || "1").trim();
  const includes_tax = formData.get("includes_tax") === "on";

  if (!session_id || !product_id || !price) return;

  const [session] = await db
    .select()
    .from(shoppingSessions)
    .where(and(eq(shoppingSessions.id, session_id), eq(shoppingSessions.user_id, userId)))
    .limit(1);

  if (!session) return;

  const unit_price = (Number(price) / Number(quantity)).toFixed(2);

  await db.insert(priceEntries).values({
    user_id:       userId,
    product_id,
    session_id,
    store_name:    session.store_name,
    city:          session.city,
    price,
    quantity,
    unit_price,
    includes_tax,
    purchase_date: session.session_date,
  });

  revalidatePath("/prices/session");
  revalidatePath("/prices/" + product_id);
}

export async function addNewProductWithPrice(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (profile?.prices_banned) throw new Error("تم إيقاف صلاحيتك في التسعير");

  const session_id   = String(formData.get("session_id")   || "").trim();
  const product_name = String(formData.get("product_name") || "").trim();
  const category     = String(formData.get("category")     || "other").trim();
  const unit         = String(formData.get("unit")         || "piece").trim();
  const price        = String(formData.get("price")        || "").trim();
  const quantity     = String(formData.get("quantity")     || "1").trim();
  const includes_tax = formData.get("includes_tax") === "on";

  if (!session_id || !product_name || !price) return;

  const [session] = await db
    .select()
    .from(shoppingSessions)
    .where(and(eq(shoppingSessions.id, session_id), eq(shoppingSessions.user_id, userId)))
    .limit(1);

  if (!session) return;

  const [newProduct] = await db
    .insert(priceProducts)
    .values({ created_by: userId, name: product_name, category, unit })
    .returning({ id: priceProducts.id });

  const unit_price = (Number(price) / Number(quantity)).toFixed(2);

  await db.insert(priceEntries).values({
    user_id:       userId,
    product_id:    newProduct.id,
    session_id,
    store_name:    session.store_name,
    city:          session.city,
    price,
    quantity,
    unit_price,
    includes_tax,
    purchase_date: session.session_date,
  });

  revalidatePath("/prices");
  revalidatePath("/prices/session");
}

export async function addMultiplePriceEntries(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (profile?.prices_banned) throw new Error("تم إيقاف صلاحيتك في التسعير");

  const session_id = String(formData.get("session_id") || "").trim();
  if (!session_id) return;

  const [session] = await db
    .select()
    .from(shoppingSessions)
    .where(and(eq(shoppingSessions.id, session_id), eq(shoppingSessions.user_id, userId)))
    .limit(1);

  if (!session) return;

  const rows: { product_id: string; price: string; quantity: string }[] = [];
  let i = 0;
  while (formData.has(`product_id_${i}`)) {
    const product_id = String(formData.get(`product_id_${i}`) || "").trim();
    const price      = String(formData.get(`price_${i}`)      || "").trim();
    const quantity   = String(formData.get(`quantity_${i}`)   || "1").trim();
    if (product_id && price) rows.push({ product_id, price, quantity });
    i++;
  }

  if (rows.length === 0) return;

  const insertedProductIds = new Set<string>();
  for (const row of rows) {
    const unit_price = (Number(row.price) / Number(row.quantity)).toFixed(2);
    await db.insert(priceEntries).values({
      user_id:       userId,
      product_id:    row.product_id,
      session_id,
      store_name:    session.store_name,
      city:          session.city,
      price:         row.price,
      quantity:      row.quantity,
      unit_price,
      purchase_date: session.session_date,
    });
    insertedProductIds.add(row.product_id);
  }

  revalidatePath("/prices/session");
  for (const pid of insertedProductIds) revalidatePath("/prices/" + pid);
}
