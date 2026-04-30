"use client";

import { useRef, useState, useTransition } from "react";
import { addMultiplePriceEntries } from "../actions";

type Product = { id: string; name: string; unit: string };
type Row = { key: number; product_id: string; price: string; quantity: string };

const UNITS: Record<string, string> = {
  piece: "قطعة",
  kg:    "كيلو",
  liter: "لتر",
  box:   "صندوق",
  pack:  "عبوة",
  meter: "متر",
};

let nextKey = 0;

function emptyRow(): Row {
  return { key: nextKey++, product_id: "", price: "", quantity: "1" };
}

export default function BatchForm({
  sessionId,
  products,
}: {
  sessionId: string;
  products: Product[];
}) {
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }

  function removeRow(key: number) {
    setRows((r) => (r.length === 1 ? r : r.filter((row) => row.key !== key)));
  }

  function updateRow(key: number, field: keyof Omit<Row, "key">, value: string) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const valid = rows.every((r) => r.product_id && r.price);
    if (!valid) {
      setError("يرجى اختيار المنتج وإدخال السعر لكل صف");
      return;
    }

    const fd = new FormData();
    fd.set("session_id", sessionId);
    rows.forEach((row, i) => {
      fd.set(`product_id_${i}`, row.product_id);
      fd.set(`price_${i}`, row.price);
      fd.set(`quantity_${i}`, row.quantity || "1");
    });

    startTransition(async () => {
      try {
        await addMultiplePriceEntries(fd);
        setRows([emptyRow()]);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "حدث خطأ");
      }
    });
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
      <h3 className="text-base font-semibold mb-4">إضافة منتجات دفعة واحدة</h3>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_80px_32px] gap-2 text-xs text-gray-500 px-1">
          <span>المنتج</span>
          <span>السعر (ر.س)</span>
          <span>الكمية</span>
          <span />
        </div>

        {/* Rows */}
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_100px_80px_32px] gap-2 items-center">
            <select
              value={row.product_id}
              onChange={(e) => updateRow(row.key, "product_id", e.target.value)}
              required
              className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 truncate"
            >
              <option value="">اختر منتجاً</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({UNITS[p.unit] ?? p.unit})
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={row.price}
              onChange={(e) => updateRow(row.key, "price", e.target.value)}
              required
              className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={row.quantity}
              onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
              className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              disabled={rows.length === 1}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add row */}
        <button
          type="button"
          onClick={addRow}
          className="self-start text-xs text-blue-400 hover:text-blue-300 transition px-1"
        >
          + إضافة صف
        </button>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {success && <p className="text-green-400 text-xs">تم الحفظ بنجاح ✓</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 transition disabled:opacity-60"
        >
          {isPending ? "جارٍ الحفظ..." : `حفظ الكل (${rows.length} ${rows.length === 1 ? "منتج" : "منتجات"})`}
        </button>
      </form>
    </div>
  );
}
