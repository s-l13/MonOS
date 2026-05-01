"use client";

import { useState } from "react";
import Card from "@/components/ui/card";
import { saveCalorieCalc } from "../actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  bmr:              number;
  tdee:             number;
  weight:           number;
  goal:             string;
  activity:         string;
  activityMultiplier: number;
};

type Macros = { protein: number; fat: number; carbs: number };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_SHORT: Record<string, string> = {
  sedentary:   "مستقر",
  light:       "خفيف",
  moderate:    "متوسط",
  active:      "نشيط",
  very_active: "عالي جداً",
};

const GOAL_AR: Record<string, string> = {
  weight_loss:    "تخسيس",
  weight_gain:    "زيادة الوزن",
  muscle_gain:    "بناء العضلات",
  cutting:        "تحديد",
  general_health: "صحة عامة",
  strength:       "قوة",
  endurance:      "تحمل",
};

const GOAL_TO_SCENARIO: Record<string, "maintain" | "loss" | "gain"> = {
  weight_loss:    "loss",
  cutting:        "loss",
  weight_gain:    "gain",
  muscle_gain:    "gain",
  strength:       "gain",
  general_health: "maintain",
  endurance:      "maintain",
};

// Deficit safety tiers
function deficitLabel(deficit: number): { text: string; cls: string; border: string } {
  if (deficit <= 500) return { text: "آمن وصحي",                      cls: "text-green-400",  border: "border-green-800 bg-green-950/40" };
  if (deficit <= 750) return { text: "معتدل",                          cls: "text-yellow-400", border: "border-yellow-800 bg-yellow-950/40" };
  return                     { text: "تحذير: عجز كبير، استشر متخصصاً", cls: "text-red-400",    border: "border-red-800 bg-red-950/40" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcMacros(targetCals: number, weight: number): Macros {
  const protein = weight * 2;
  const fat     = (targetCals * 0.25) / 9;
  const carbs   = (targetCals - protein * 4 - fat * 9) / 4;
  return { protein, fat, carbs };
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function CaloriesClient({
  bmr, tdee, weight, goal, activity, activityMultiplier,
}: Props) {
  const [deficit, setDeficit] = useState(500);
  const [surplus, setSurplus] = useState(300);

  const activeKey = GOAL_TO_SCENARIO[goal] ?? "maintain";

  const lossCals     = tdee - deficit;
  const gainCals     = tdee + surplus;

  const maintainMacros = calcMacros(tdee, weight);
  const lossMacros     = calcMacros(lossCals, weight);
  const gainMacros     = calcMacros(gainCals, weight);

  // Estimated weight change (1 kg body fat ≈ 7700 kcal)
  const weeklyLoss  = (deficit * 7) / 7700;
  const monthlyLoss = weeklyLoss * 4;
  const weeklyGain  = (surplus * 7) / 7700;
  const monthlyGain = weeklyGain * 4;

  const dl = deficitLabel(deficit);

  // Values for save form (recommended scenario)
  const recCals   = activeKey === "loss" ? lossCals  : activeKey === "gain" ? gainCals  : tdee;
  const recMacros = activeKey === "loss" ? lossMacros : activeKey === "gain" ? gainMacros : maintainMacros;

  return (
    <div className="space-y-6">

      {/* ── BMR / TDEE ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">BMR — معدل الأيض الأساسي</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-gray-100">{Math.round(bmr)} سعر</p>
          <p className="mt-1 text-xs text-gray-700">سعرات الجسم في حالة الراحة الكاملة</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">TDEE — إجمالي الحرق اليومي</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-gray-100">{Math.round(tdee)} سعر</p>
          <p className="mt-1 text-xs text-gray-700">
            BMR × {activityMultiplier} ({ACTIVITY_SHORT[activity] ?? activity})
          </p>
        </div>
      </div>

      {/* ── Scenario heading ────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-400">
          السعرات حسب الهدف
          <span className="mr-2 text-xs font-normal text-gray-600">
            — المحدد بالأزرق يطابق هدفك ({GOAL_AR[goal] ?? goal})
          </span>
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* ── MAINTAIN ────────────────────────────────────────────────── */}
          <ScenarioCard
            isActive={activeKey === "maintain"}
            label="للثبات في الوزن"
            note="TDEE بلا تعديل"
            targetCals={tdee}
            macros={maintainMacros}
          />

          {/* ── LOSS ────────────────────────────────────────────────────── */}
          <div className={`rounded-xl border-2 bg-gray-900 p-5 space-y-4 ${
            activeKey === "loss"
              ? "border-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]"
              : "border-gray-800"
          }`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-bold ${activeKey === "loss" ? "text-blue-300" : "text-gray-300"}`}>
                لنزول الوزن
              </p>
              {activeKey === "loss" && (
                <span className="rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-400">هدفك</span>
              )}
            </div>

            {/* Deficit adjuster */}
            <div className={`rounded-lg border p-3 space-y-2 ${dl.border}`}>
              <p className="text-xs text-gray-400 text-center">العجز اليومي</p>
              <div className="flex items-center justify-center gap-4">
                <AdjustButton onClick={() => setDeficit((d) => Math.max(200, d - 50))} label="−" />
                <span className="w-24 text-center text-lg font-bold tabular-nums text-gray-100">
                  {deficit} سعرة
                </span>
                <AdjustButton onClick={() => setDeficit((d) => Math.min(1000, d + 50))} label="+" />
              </div>
              <p className={`text-xs text-center font-semibold ${dl.cls}`}>{dl.text}</p>
            </div>

            {/* Target calories */}
            <CaloriesDisplay
              cals={lossCals}
              isActive={activeKey === "loss"}
            />

            {/* Estimated loss */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <EstimateCell label="الخسارة/أسبوع" value={`${weeklyLoss.toFixed(2)} كغ`} color="text-green-400" />
              <EstimateCell label="الخسارة/شهر"   value={`${monthlyLoss.toFixed(1)} كغ`} color="text-green-400" />
            </div>

            <MacrosRow macros={lossMacros} />
          </div>

          {/* ── GAIN ────────────────────────────────────────────────────── */}
          <div className={`rounded-xl border-2 bg-gray-900 p-5 space-y-4 ${
            activeKey === "gain"
              ? "border-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]"
              : "border-gray-800"
          }`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-bold ${activeKey === "gain" ? "text-blue-300" : "text-gray-300"}`}>
                لزيادة الوزن
              </p>
              {activeKey === "gain" && (
                <span className="rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-400">هدفك</span>
              )}
            </div>

            {/* Surplus adjuster */}
            <div className="rounded-lg border border-blue-900 bg-blue-950/30 p-3 space-y-2">
              <p className="text-xs text-gray-400 text-center">الفائض اليومي</p>
              <div className="flex items-center justify-center gap-4">
                <AdjustButton onClick={() => setSurplus((s) => Math.max(100, s - 50))} label="−" />
                <span className="w-24 text-center text-lg font-bold tabular-nums text-gray-100">
                  {surplus} سعرة
                </span>
                <AdjustButton onClick={() => setSurplus((s) => Math.min(600, s + 50))} label="+" />
              </div>
              <p className="text-xs text-center font-semibold text-blue-300">فائض تدريجي — زيادة صحية</p>
            </div>

            {/* Target calories */}
            <CaloriesDisplay
              cals={gainCals}
              isActive={activeKey === "gain"}
            />

            {/* Estimated gain */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <EstimateCell label="الزيادة/أسبوع" value={`${weeklyGain.toFixed(2)} كغ`} color="text-blue-400" />
              <EstimateCell label="الزيادة/شهر"   value={`${monthlyGain.toFixed(1)} كغ`} color="text-blue-400" />
            </div>

            <MacrosRow macros={gainMacros} />
          </div>

        </div>
      </div>

      {/* ── Save recommended scenario ────────────────────────────────────── */}
      <Card>
        <p className="mb-3 text-xs text-gray-500">
          حفظ السيناريو الموصى به ({GOAL_AR[goal] ?? goal}):{" "}
          {Math.round(recCals)} سعر •{" "}
          بروتين {Math.round(recMacros.protein)}غ •{" "}
          كارب {Math.round(recMacros.carbs)}غ •{" "}
          دهون {Math.round(recMacros.fat)}غ
        </p>
        <form action={saveCalorieCalc}>
          <input type="hidden" name="bmr"             value={String(Math.round(bmr))} />
          <input type="hidden" name="tdee"            value={String(Math.round(tdee))} />
          <input type="hidden" name="target_calories" value={String(Math.round(recCals))} />
          <input type="hidden" name="protein_g"       value={String(Math.round(recMacros.protein))} />
          <input type="hidden" name="carbs_g"         value={String(Math.round(recMacros.carbs))} />
          <input type="hidden" name="fat_g"           value={String(Math.round(recMacros.fat))} />
          <input type="hidden" name="goal"            value={goal} />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            حفظ الحسابات الموصى بها
          </button>
        </form>
      </Card>

      <p className="text-center text-xs text-gray-700">
        هذه تقديرات علمية. استشر متخصصاً للحصول على خطة دقيقة.
      </p>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AdjustButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-lg font-bold text-gray-200 transition hover:bg-gray-600"
    >
      {label}
    </button>
  );
}

function CaloriesDisplay({ cals, isActive }: { cals: number; isActive: boolean }) {
  return (
    <div className="rounded-lg bg-gray-800/60 py-2 text-center">
      <p className={`text-3xl font-bold tabular-nums ${isActive ? "text-blue-400" : "text-gray-200"}`}>
        {Math.round(cals)}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">سعر/يوم</p>
    </div>
  );
}

function EstimateCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-gray-800/40 py-2">
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function MacrosRow({ macros }: { macros: Macros }) {
  const { protein, fat, carbs } = macros;
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-xs text-gray-600">بروتين</p>
        <p className="mt-0.5 text-sm font-semibold text-green-400">{Math.round(protein)}غ</p>
        <p className="text-xs text-gray-600">{Math.round(protein * 4)} سعرة</p>
      </div>
      <div>
        <p className="text-xs text-gray-600">كارب</p>
        <p className="mt-0.5 text-sm font-semibold text-yellow-400">{Math.round(carbs)}غ</p>
        <p className="text-xs text-gray-600">{Math.round(carbs * 4)} سعرة</p>
      </div>
      <div>
        <p className="text-xs text-gray-600">دهون</p>
        <p className="mt-0.5 text-sm font-semibold text-red-400">{Math.round(fat)}غ</p>
        <p className="text-xs text-gray-600">{Math.round(fat * 9)} سعرة</p>
      </div>
    </div>
  );
}

function ScenarioCard({
  isActive, label, note, targetCals, macros,
}: {
  isActive:   boolean;
  label:      string;
  note:       string;
  targetCals: number;
  macros:     Macros;
}) {
  return (
    <div className={`rounded-xl border-2 bg-gray-900 p-5 space-y-4 ${
      isActive
        ? "border-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]"
        : "border-gray-800"
    }`}>
      <div>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold ${isActive ? "text-blue-300" : "text-gray-300"}`}>{label}</p>
          {isActive && (
            <span className="rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-400">هدفك</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-600">{note}</p>
      </div>
      <CaloriesDisplay cals={targetCals} isActive={isActive} />
      <MacrosRow macros={macros} />
    </div>
  );
}
