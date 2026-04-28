"use client";

import { useState, useRef } from "react";
import { createDebt } from "@/app/finance/actions";

const inputCls =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-gray-500 focus:outline-none";

type Contact = { id: string; name: string; phone: string | null };

export default function AddDebtForm({ contacts }: { contacts: Contact[] }) {
  const [debtType, setDebtType]       = useState("single_payment");
  const [selectedContact, setContact] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  function handleContactChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setContact(id);
    const c = contacts.find((c) => c.id === id);
    if (c && nameRef.current) nameRef.current.value = c.name;
  }

  return (
    <form action={createDebt} className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {/* Direction */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">الاتجاه *</label>
        <select name="direction" required className={inputCls}>
          <option value="i_owe">عليّ</option>
          <option value="they_owe">لي</option>
        </select>
      </div>

      {/* Contact picker */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">جهة الاتصال</label>
        <select
          name="contact_id"
          value={selectedContact}
          onChange={handleContactChange}
          className={inputCls}
        >
          <option value="">— اختر أو اكتب اسماً —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.phone ? ` (${c.phone})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Person name */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">الاسم *</label>
        <input
          ref={nameRef}
          type="text"
          name="person_name"
          required
          placeholder="اسم الشخص"
          className={inputCls}
        />
      </div>

      {/* Amount */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">المبلغ الكلي *</label>
        <input
          type="number" name="amount" step="0.01" min="0.01" required
          placeholder="0.00" className={inputCls}
        />
      </div>

      {/* Currency */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">العملة</label>
        <select name="currency" className={inputCls}>
          <option value="SAR">ريال سعودي (ر.س)</option>
          <option value="USD">دولار ($)</option>
        </select>
      </div>

      {/* Due date */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">تاريخ الاستحقاق</label>
        <input type="date" name="due_date" className={inputCls} />
      </div>

      {/* Description */}
      <div className="col-span-2 md:col-span-3">
        <label className="mb-1 block text-xs text-gray-500">الوصف</label>
        <input type="text" name="description" placeholder="اختياري" className={inputCls} />
      </div>

      {/* Debt type */}
      <div className="col-span-2 md:col-span-3">
        <label className="mb-1 block text-xs text-gray-500">نوع السداد *</label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="debt_type"
              value="single_payment"
              checked={debtType === "single_payment"}
              onChange={() => setDebtType("single_payment")}
              className="accent-blue-500"
            />
            دفعة واحدة
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="debt_type"
              value="installments"
              checked={debtType === "installments"}
              onChange={() => setDebtType("installments")}
              className="accent-blue-500"
            />
            أقساط
          </label>
        </div>
      </div>

      {/* Installment fields — only visible when installments selected */}
      {debtType === "installments" && (
        <div className="col-span-2 grid grid-cols-1 gap-3 rounded-lg border border-gray-700 p-4 md:col-span-3 md:grid-cols-3">
          <p className="col-span-1 text-xs text-gray-500 md:col-span-3">تفاصيل الأقساط</p>
          <div>
            <label className="mb-1 block text-xs text-gray-500">مبلغ القسط *</label>
            <input
              type="number" name="installment_amount" step="0.01" min="0.01"
              placeholder="0.00" className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">عدد الأقساط *</label>
            <input
              type="number" name="num_installments" min="1" max="360"
              placeholder="12" className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">تاريخ البداية *</label>
            <input type="date" name="installment_start" className={inputCls} />
          </div>
        </div>
      )}

      <div className="col-span-2 pt-1 md:col-span-3">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          إضافة الدين
        </button>
      </div>
    </form>
  );
}
