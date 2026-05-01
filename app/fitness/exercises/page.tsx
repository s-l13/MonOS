import Sidebar from "@/components/sidebar";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { exerciseLibrary } from "@/lib/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";

const MUSCLE_AR: Record<string, string> = {
  chest:     "صدر",
  back:      "ظهر",
  legs:      "أرجل",
  shoulders: "أكتاف",
  biceps:    "بايسبس",
  triceps:   "ترايسبس",
  core:      "كور",
  cardio:    "كارديو",
};

const DIFFICULTY_AR: Record<string, string> = {
  easy:   "سهل",
  medium: "متوسط",
  hard:   "صعب",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   "bg-green-950 text-green-400",
  medium: "bg-yellow-950 text-yellow-400",
  hard:   "bg-red-950 text-red-400",
};

const MUSCLE_EMOJI: Record<string, string> = {
  chest:     "🏋️",
  back:      "🔙",
  legs:      "🦵",
  shoulders: "💪",
  biceps:    "💪",
  triceps:   "💪",
  core:      "🎯",
  cardio:    "🏃",
};

export default async function ExercisesPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const exercises = await db.select().from(exerciseLibrary).orderBy(asc(exerciseLibrary.muscle_group), asc(exerciseLibrary.name_ar));

  const groups = Array.from(new Set(exercises.map((e) => e.muscle_group)));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-5xl space-y-6">

          <div className="flex items-center gap-3">
            <Link href="/fitness" className="text-sm text-gray-500 hover:text-gray-300">← الصحة والرياضة</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">مكتبة التمارين</h1>
          </div>

          {/* Group filter links */}
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span
                key={g}
                className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-300"
              >
                {MUSCLE_EMOJI[g] ?? "🏋️"} {MUSCLE_AR[g] ?? g}
              </span>
            ))}
          </div>

          {/* Exercise cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{MUSCLE_EMOJI[ex.muscle_group] ?? "🏋️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-100">{ex.name_ar}</p>
                    <p className="text-xs text-gray-500">{ex.name_en}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-300">
                    {MUSCLE_AR[ex.muscle_group] ?? ex.muscle_group}
                  </span>
                  {ex.equipment && (
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      {ex.equipment}
                    </span>
                  )}
                  {ex.difficulty && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${DIFFICULTY_COLOR[ex.difficulty] ?? "bg-gray-800 text-gray-400"}`}>
                      {DIFFICULTY_AR[ex.difficulty] ?? ex.difficulty}
                    </span>
                  )}
                </div>

                {ex.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">{ex.description}</p>
                )}
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
