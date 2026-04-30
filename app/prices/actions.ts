"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceProducts, priceEntries } from "@/lib/schema";

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

  const product_id    = String(formData.get("product_id")    || "").trim();
  const store_name    = String(formData.get("store_name")    || "").trim();
  const city          = String(formData.get("city")          || "").trim() || null;
  const price         = String(formData.get("price")         || "").trim();
  const quantity      = String(formData.get("quantity")      || "1").trim();
  const purchase_date = String(formData.get("purchase_date") || "").trim();
  const notes         = String(formData.get("notes")         || "").trim() || null;

  if (!product_id || !store_name || !price || !purchase_date) return;

  const unit_price = (Number(price) / Number(quantity)).toFixed(2);

  await db.insert(priceEntries).values({
    user_id: userId,
    product_id,
    store_name,
    city,
    price,
    quantity,
    unit_price,
    purchase_date,
    notes,
  });

  revalidatePath("/prices");
  revalidatePath("/prices/" + product_id);
}

export async function deletePriceEntry(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const id         = String(formData.get("id")         || "").trim();
  const product_id = String(formData.get("product_id") || "").trim();
  if (!id) return;

  await db
    .delete(priceEntries)
    .where(and(eq(priceEntries.id, id), eq(priceEntries.user_id, userId)));

  revalidatePath("/prices");
  if (product_id) revalidatePath("/prices/" + product_id);
}
