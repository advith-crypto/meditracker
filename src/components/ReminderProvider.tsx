/**
 * MediTracker — reminder scheduler + in-app alert panel.
 *
 * While the app is open this component checks periodically for doses that
 * are due (or snoozed reminders that have come up), marks long-overdue doses as
 * missed, fires system notifications when permitted, and renders a dismissible
 * alert with Taken / Skip / Snooze actions.
 *
 * Browser limitation (surfaced honestly in the UI): reminders can only fire
 * while MediTracker is open in the browser. There is no background service
 * that can wake the page when it is closed.
 */
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, Check, Pill, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DOSE_GRACE_MS,
  type DB,
  formatTime12,
  parseLocalDateTime,
  syncDoses,
  type Dose,
} from "@/lib/medicines";
import {
  fireSystemNotification,
  playChime,
  pruneReminders,
  pushReminder,
  removeReminder,
  subscribeReminders,
  type ReminderEvent,
  vibrate,
} from "@/lib/reminders";
import {
  actionMarkDose,
  actionSnoozeDose,
  getDB,
  mutate,
} from "@/lib/store";
import { Button } from "@/components/ui/button";

const TICK_MS = 30_000;

function dueDoses(db: DB, nowMs: number): Dose[] {
  const meds = new Map(db.medicines.map((m) => [m.id, m]));
  const out: Dose[] = [];
  for (const d of db.doses) {
    if (d.status !== "upcoming" || d.reminderSentAt) continue;
    const med = meds.get(d.medicineId);
    if (!med || med.paused || !med.reminderEnabled) continue;
    const t = parseLocalDateTime(d.scheduledAt).getTime();
    if (t <= nowMs && nowMs - t <= DOSE_GRACE_MS) out.push(d);
  }
  return out;
}

function dueSnoozes(db: DB, nowMs: number) {
  return db.snoozes.filter((s) => parseLocalDateTime(s.fireAt).getTime() <= nowMs);
}

export function ReminderProvider() {
  const [events, setEvents] = useState<ReminderEvent[]>([]);

  useEffect(() => subscribeReminders(setEvents), []);

  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;

    const tick = () => {
      if (disposed) return;
      const nowMs = Date.now();

      // 1. Reconcile schedules + mark overdue doses as missed.
      mutate(syncDoses);

      const db = getDB();
      if (!db.settings.notificationsEnabled) return;

      // 2. Fire reminders for due doses.
      const due = dueDoses(db, nowMs);
      if (due.length > 0) {
        mutate((draft) => {
          const ids = new Set(due.map((d) => d.id));
          for (const d of draft.doses) {
            if (ids.has(d.id) && !d.reminderSentAt) {
              d.reminderSentAt = new Date().toISOString();
            }
          }
          return draft;
        });
        const meds = new Map(db.medicines.map((m) => [m.id, m]));
        for (const d of due) {
          const med = meds.get(d.medicineId);
          if (!med) continue;
          pushReminder({
            id: `due-${d.id}`,
            doseId: d.id,
            medicineName: med.name,
            dosageText: d.dosageText,
            timeLabel: formatTime12(d.scheduledAt.slice(11, 16)),
            snoozed: false,
          });
          fireSystemNotification(med.name, d.dosageText, d.id);
        }
        if (db.settings.sound) playChime();
        if (db.settings.vibration) vibrate();
      }

      // 3. Fire snoozed reminders.
      const snoozes = dueSnoozes(db, nowMs);
      if (snoozes.length > 0) {
        const doseById = new Map(db.doses.map((d) => [d.id, d]));
        mutate((draft) => {
          draft.snoozes = draft.snoozes.filter(
            (s) => !snoozes.some((x) => x.id === s.id),
          );
          return draft;
        });
        for (const s of snoozes) {
          const dose = doseById.get(s.doseId);
          if (!dose) continue;
          pushReminder({
            id: `snooze-${s.id}`,
            doseId: s.doseId,
            medicineName: dose.medicineName,
            dosageText: dose.dosageText,
            timeLabel: formatTime12(dose.scheduledAt.slice(11, 16)),
            snoozed: true,
          });
        }
        if (db.settings.sound) playChime();
        if (db.settings.vibration) vibrate();
      }

      // 4. Prune stale alerts (dose taken elsewhere / medicine paused).
      pruneReminders(new Set(getDB().doses.map((d) => d.id)));
    };

    // Initial sync (also marks doses that were missed while the app was shut).
    tick();
    timer = window.setInterval(tick, TICK_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      disposed = true;
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, []);

  const handleTaken = (ev: ReminderEvent) => {
    actionMarkDose(ev.doseId, "taken");
    removeReminder(ev.id);
    toast.success("Dose marked as taken");
  };

  const handleSkipped = (ev: ReminderEvent) => {
    actionMarkDose(ev.doseId, "skipped");
    removeReminder(ev.id);
    toast.success("Dose marked as skipped");
  };

  const handleSnooze = (ev: ReminderEvent, minutes: number) => {
    actionSnoozeDose(ev.doseId, minutes);
    removeReminder(ev.id);
    toast.info(`Reminder snoozed for ${minutes} minutes`);
  };

  const handleDismiss = (ev: ReminderEvent) => {
    // Snooze one default interval when dismissed from the panel.
    handleSnooze(ev, getDB().settings.defaultSnooze);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
      <AnimatePresence>
        {events.map((ev) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-popover/95 p-4 shadow-xl shadow-black/5 backdrop-blur"
            role="alertdialog"
            aria-label="Medicine reminder"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <Pill className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {ev.snoozed ? "Reminder (snoozed)" : "Medicine reminder"}
                </p>
                <p className="mt-0.5 truncate text-base font-semibold">
                  {ev.medicineName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ev.dosageText} · {ev.timeLabel}
                </p>
              </div>
              <AlarmClock className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => handleTaken(ev)}
              >
                <Check className="size-4" /> Taken
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => handleSkipped(ev)}
              >
                <SkipForward className="size-4" /> Skip
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-1 text-xs text-muted-foreground">
              <span className="font-medium">Snooze</span>
              <div className="flex gap-1">
                {[10, 30, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSnooze(ev, m)}
                    className="rounded-full border border-border px-2.5 py-1 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {m} min
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleDismiss(ev)}
                  className="rounded-full px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}