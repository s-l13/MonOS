"use client";

import { useState, useTransition } from "react";
import { saveTaxRate } from "@/app/profile/actions";

export default function TaxSettings({ taxRate }: { taxRate: number }) {
  const [editing, setEditing]   = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await saveTaxRate(fd);
      setEditing(false);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-sm">
      <span className="text-gray-500">ضريبة القيمة المضافة:</span>

      {editing ? (
        <form onSubmit={handleSave} className="flex items-center gap-2">
          <input
            name="tax_rate"
            type="number"
            min="0"
            max="30"
            step="0.5"
            defaultValue={taxRate}
            className="w-20 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
          <span className="text-xs text-gray-400">%</span>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {isPending ? "..." : "حفظ"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-gray-500 transition hover:text-gray-300"
          >
            إلغاء
          </button>
        </form>
      ) : (
        <>
          <span className="font-bold text-gray-100">{taxRate}%</span>
          <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400">مفعّلة</span>
          <span className="text-xs text-gray-600">تُطبق على جميع المنتجات تلقائياً</span>
          <button
            onClick={() => setEditing(true)}
            className="mr-auto text-xs text-blue-400 transition hover:text-blue-300"
          >
            تعديل
          </button>
        </>
      )}
    </div>
  );
}
