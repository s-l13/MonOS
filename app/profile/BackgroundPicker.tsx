"use client";

import { useTransition } from "react";
import { saveBackground } from "./actions";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SOLID_COLORS = [
  { id: "default",  label: "الافتراضي",   value: "#0a0a0f" },
  { id: "midnight", label: "منتصف الليل", value: "#0d1117" },
  { id: "navy",     label: "أزرق داكن",   value: "#0a0f1f" },
  { id: "forest",   label: "أخضر داكن",   value: "#0a1a0f" },
  { id: "purple",   label: "بنفسجي داكن", value: "#0f0a1f" },
  { id: "charcoal", label: "فحمي",        value: "#1a1a1a" },
  { id: "wine",     label: "عنابي",       value: "#1a0a0f" },
  { id: "teal",     label: "أزرق مخضر",  value: "#0a1a1a" },
];

const GRADIENTS = [
  { id: "grad_blue",   label: "أزرق",   value: "linear-gradient(135deg, #0a0a0f 0%, #0a0f2a 100%)" },
  { id: "grad_green",  label: "أخضر",   value: "linear-gradient(135deg, #0a0a0f 0%, #0a1f0a 100%)" },
  { id: "grad_purple", label: "بنفسجي", value: "linear-gradient(135deg, #0a0a0f 0%, #1a0a2f 100%)" },
  { id: "grad_warm",   label: "دافئ",   value: "linear-gradient(135deg, #0f0a0a 0%, #1f0f0a 100%)" },
  { id: "grad_teal",   label: "زمردي",  value: "linear-gradient(135deg, #0a0a0f 0%, #0a1f1f 100%)" },
  { id: "grad_gold",   label: "ذهبي",   value: "linear-gradient(135deg, #0f0a00 0%, #1f1500 100%)" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BackgroundPicker({ currentBg }: { currentBg: string }) {
  const [isPending, startTransition] = useTransition();

  function select(id: string) {
    const fd = new FormData();
    fd.set("background", id);
    startTransition(() => saveBackground(fd));
  }

  return (
    <div className={`space-y-6 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>

      {/* ── Solid colours ─────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-medium text-gray-500">ألوان صلبة</p>
        <div className="flex flex-wrap gap-4">
          {SOLID_COLORS.map((c) => {
            const isActive = currentBg === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className="flex flex-col items-center gap-1.5 group"
                title={c.label}
              >
                <div
                  className={`relative h-12 w-12 rounded-xl border-2 transition ${
                    isActive
                      ? "border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]"
                      : "border-gray-700 group-hover:border-gray-500"
                  }`}
                  style={{ background: c.value }}
                >
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 group-hover:text-gray-300 transition">
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Gradients ─────────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-medium text-gray-500">تدرجات لونية</p>
        <div className="flex flex-wrap gap-4">
          {GRADIENTS.map((g) => {
            const isActive = currentBg === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => select(g.id)}
                className="flex flex-col items-center gap-1.5 group"
                title={g.label}
              >
                <div
                  className={`relative h-12 w-12 rounded-xl border-2 transition ${
                    isActive
                      ? "border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]"
                      : "border-gray-700 group-hover:border-gray-500"
                  }`}
                  style={{ background: g.value }}
                >
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 group-hover:text-gray-300 transition">
                  {g.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isPending && (
        <p className="text-xs text-blue-400">جاري الحفظ...</p>
      )}
    </div>
  );
}
