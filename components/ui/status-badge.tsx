type StatusBadgeProps = {
  status: string;
  label?: string;
};

type BadgeConfig = {
  label: string;
  classes: string;
};

const STATUS_MAP: Record<string, BadgeConfig> = {
  // Entity statuses
  active:    { label: "نشط",            classes: "bg-green-900/40 text-green-400 ring-green-800" },
  inactive:  { label: "غير نشط",        classes: "bg-gray-800 text-gray-400 ring-gray-700" },
  setup:     { label: "تحت التأسيس",    classes: "bg-amber-900/40 text-amber-400 ring-amber-800" },

  // Project statuses
  planning:  { label: "تخطيط",          classes: "bg-blue-900/40 text-blue-400 ring-blue-800" },
  completed: { label: "مكتمل",          classes: "bg-green-900/40 text-green-400 ring-green-800" },
  paused:    { label: "متوقف",          classes: "bg-gray-800 text-gray-400 ring-gray-700" },

  // Task statuses
  new:         { label: "جديدة",        classes: "bg-sky-900/40 text-sky-400 ring-sky-800" },
  in_progress: { label: "قيد التنفيذ", classes: "bg-blue-900/40 text-blue-400 ring-blue-800" },
  late:        { label: "متأخرة",       classes: "bg-red-900/40 text-red-400 ring-red-800" },
  postponed:   { label: "مؤجلة",        classes: "bg-gray-800 text-gray-400 ring-gray-700" },

  // User approval statuses
  approved: { label: "معتمد",          classes: "bg-green-900/40 text-green-400 ring-green-800" },
  pending:  { label: "قيد المراجعة",   classes: "bg-amber-900/40 text-amber-400 ring-amber-800" },
  rejected: { label: "مرفوض",          classes: "bg-red-900/40 text-red-400 ring-red-800" },
  disabled: { label: "معطل",           classes: "bg-gray-800 text-gray-400 ring-gray-700" },

  // User roles
  super_admin: { label: "سوبر أدمن",   classes: "bg-purple-900/40 text-purple-400 ring-purple-800" },
  user:        { label: "مستخدم",      classes: "bg-gray-800 text-gray-400 ring-gray-700" },

  // Task priority (label overridden at call site)
  low:    { label: "منخفض", classes: "bg-gray-800 text-gray-400 ring-gray-700" },
  medium: { label: "متوسط", classes: "bg-blue-900/40 text-blue-400 ring-blue-800" },
  high:   { label: "عالي",  classes: "bg-amber-900/40 text-amber-400 ring-amber-800" },
  urgent: { label: "عاجل",  classes: "bg-red-900/40 text-red-400 ring-red-800" },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_MAP[status];

  const displayLabel = label ?? config?.label ?? status;
  const classes = config?.classes ?? "bg-gray-800 text-gray-400 ring-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {displayLabel}
    </span>
  );
}
