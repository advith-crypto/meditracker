import { CheckCircle2, CircleAlert, Clock, SkipForward } from "lucide-react";
import type { ReactNode } from "react";
import type { DoseStatus } from "@/lib/medicines";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  DoseStatus,
  { label: string; icon: typeof Clock; className: string; dot: string }
> = {
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    className:
      "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  taken: {
    label: "Taken",
    icon: CheckCircle2,
    className:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    dot: "bg-emerald-600 dark:bg-emerald-400",
  },
  skipped: {
    label: "Skipped",
    icon: SkipForward,
    className:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    dot: "bg-amber-600 dark:bg-amber-400",
  },
  missed: {
    label: "Missed",
    icon: CircleAlert,
    className:
      "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-400",
    dot: "bg-red-600 dark:bg-red-400",
  },
};

export function statusMeta(status: DoseStatus) {
  return STATUS_META[status];
}

/** Pill badge with icon + text (never color-only). */
export function DoseStatusBadge({
  status,
  className,
}: {
  status: DoseStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

/** Small colored dot used in legends and compact rows. */
export function StatusDot({ status }: { status: DoseStatus }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 rounded-full", STATUS_META[status].dot)}
    />
  );
}

export function ProgressRing({
  percent,
  size = 132,
  stroke = 9,
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}% completed`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-foreground transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight">{clamped}%</span>
        {label && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}