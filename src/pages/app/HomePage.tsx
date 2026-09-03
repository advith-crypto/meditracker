import {
  ArrowRight,
  BellOff,
  Check,
  ChevronRight,
  CircleAlert,
  Pill,
  Plus,
  SkipForward,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { DoseStatusBadge, ProgressRing, SectionHeading } from "@/components/status";
import {
  type Dose,
  formatDateLong,
  formatTime12,
  mealLabel,
  nextReminder,
  parseLocalDateTime,
  relativeDayLabel,
  todayStr,
} from "@/lib/medicines";
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/reminders";
import {
  actionMarkDose,
  actionUpdateSettings,
  useDB,
} from "@/lib/store";
import { cn } from "@/lib/utils";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const db = useDB();
  const navigate = useNavigate();
  const today = todayStr();
  const nowMs = Date.now();
  const perm = notificationPermission();

  const medsById = new Map(db.medicines.map((m) => [m.id, m]));
  const todaysDoses = db.doses
    .filter((d) => d.scheduledAt.slice(0, 10) === today && medsById.has(d.medicineId))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const total = todaysDoses.length;
  const taken = todaysDoses.filter((d) => d.status === "taken").length;
  const skipped = todaysDoses.filter((d) => d.status === "skipped").length;
  const missed = todaysDoses.filter((d) => d.status === "missed").length;
  const remaining = todaysDoses.filter((d) => d.status === "upcoming").length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  const next = nextReminder(db);

  const showPermissionBanner =
    db.settings.notificationsEnabled &&
    (perm === "default" || perm === "denied");

  const handleDoseAction = (dose: Dose, status: "taken" | "skipped") => {
    actionMarkDose(dose.id, status);
    toast.success(
      status === "taken" ? "Dose marked as taken" : "Dose marked as skipped",
    );
  };

  const hasMedicines = db.medicines.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">{greeting()}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDateLong(today)}
        </p>
      </header>

      {showPermissionBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4">
          <BellOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 text-sm text-muted-foreground">
            {perm === "denied"
              ? "Notifications are currently disabled. Enable them in your browser to receive medicine reminders."
              : "Enable notifications to receive medicine reminders."}
            <button
              type="button"
              onClick={async () => {
                if (!notificationsSupported()) return;
                await requestNotificationPermission();
                actionUpdateSettings({ permissionAsked: true });
              }}
              className="mt-1.5 block font-medium text-foreground underline underline-offset-4"
            >
              Enable notifications
            </button>
          </div>
        </div>
      )}

      {!hasMedicines ? (
        <Empty className="border border-border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Pill />
            </EmptyMedia>
            <EmptyTitle>No medicines added yet</EmptyTitle>
            <EmptyDescription>
              Add your first medicine to start receiving reminders.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              className="h-12 px-6 text-base"
              onClick={() => navigate("/app/medicines/new")}
            >
              <Plus /> Add Medicine
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {/* Today's medication summary */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <SectionHeading title="Today’s Medication" />
            <div className="flex items-center gap-6">
              <ProgressRing percent={pct} label="completed" />
              <div className="flex-1 space-y-3">
                <p className="text-lg font-medium leading-snug">
                  {total > 0 ? (
                    <>
                      {taken} of {total} doses taken
                      <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                        {remaining} remaining · {missed} missed
                      </span>
                    </>
                  ) : (
                    "No doses scheduled today"
                  )}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Taken", value: taken, cls: "text-emerald-700 dark:text-emerald-400" },
                    { label: "Skipped", value: skipped, cls: "text-amber-700 dark:text-amber-400" },
                    { label: "Missed", value: missed, cls: "text-red-700 dark:text-red-400" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-border/70 bg-background px-2 py-2.5"
                    >
                      <p className={cn("text-lg font-semibold tabular-nums", s.cls)}>
                        {s.value}
                      </p>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
                {next && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Next:</span>
                    {next.medicineName} at {formatTime12(next.scheduledAt.slice(11, 16))}
                    {next.scheduledAt.slice(0, 10) !== today &&
                      ` · ${relativeDayLabel(next.scheduledAt.slice(0, 10))}`}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Today's schedule */}
          <section>
            <SectionHeading
              title="Today’s Schedule"
              action={
                <Link
                  to="/app/history"
                  className="flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {todaysDoses.length === 0 ? (
              <Empty className="border border-border py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CircleAlert />
                  </EmptyMedia>
                  <EmptyTitle>You’re all caught up! 🎉</EmptyTitle>
                  <EmptyDescription>
                    No medicines are scheduled for today.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="space-y-2.5">
                {todaysDoses.map((dose) => {
                  const med = medsById.get(dose.medicineId);
                  if (!med) return null;
                  const isActionable =
                    dose.status === "upcoming" || dose.status === "missed";
                  const time = formatTime12(dose.scheduledAt.slice(11, 16));
                  return (
                    <li
                      key={dose.id}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl border bg-card p-4 transition-opacity",
                        dose.status === "upcoming"
                          ? "border-border"
                          : "border-border/60",
                      )}
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                        <Pill className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{dose.medicineName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {dose.dosageText}
                          {med.mealInstruction !== "none" &&
                            ` · ${mealLabel(med.mealInstruction)}`}
                        </p>
                        {dose.status === "missed" && (
                          <p className="mt-0.5 text-xs text-muted-foreground/80">
                            This dose was not recorded.
                          </p>
                        )}
                        {dose.actionAt && (
                          <p className="mt-0.5 text-xs text-muted-foreground/80">
                            {dose.status === "taken" ? "Taken" : "Skipped"}{" "}
                            {new Date(dose.actionAt).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            isActionable && nowMs >= parseLocalDateTime(dose.scheduledAt).getTime() &&
                              dose.status === "upcoming"
                              ? "text-red-700 dark:text-red-400"
                              : "",
                          )}
                        >
                          {time}
                        </p>
                        {isActionable ? (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => handleDoseAction(dose, "taken")}
                            >
                              <Check className="size-3.5" /> Taken
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleDoseAction(dose, "skipped")}
                            >
                              <SkipForward className="size-3.5" /> Skip
                            </Button>
                          </div>
                        ) : (
                          <DoseStatusBadge status={dose.status} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Upcoming beyond today */}
          {next && next.scheduledAt.slice(0, 10) !== today && (
            <section>
              <SectionHeading title="Upcoming Reminders" />
              <Link
                to="/app/medicines"
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Pill className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{next.medicineName}</p>
                  <p className="text-sm text-muted-foreground">
                    {next.dosageText} · {formatTime12(next.scheduledAt.slice(11, 16))}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}