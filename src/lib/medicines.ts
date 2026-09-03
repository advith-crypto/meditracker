/**
 * MediTracker — core domain types and pure schedule logic.
 *
 * All date math is done in the user's local timezone. Dates are stored as
 * "YYYY-MM-DD" and times as "HH:MM" (24h). Dose timestamps are stored as local
 * ISO strings without a timezone suffix ("YYYY-MM-DDTHH:MM:SS").
 */

export type Unit = "tablet" | "capsule" | "ml" | "drops" | "spoon" | "other";
export type Frequency = "once" | "daily" | "twice" | "thrice" | "four" | "custom";
export type Meal = "none" | "before" | "after" | "with" | "empty";
export type DoseStatus = "upcoming" | "taken" | "skipped" | "missed";
export type ThemePref = "light" | "dark" | "system";

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  unit: Unit;
  frequency: Frequency;
  /** Reminder times, 24h "HH:MM". */
  times: string[];
  /** Days of week for custom frequency (0 = Sunday … 6 = Saturday). */
  days: number[];
  /** Start date "YYYY-MM-DD". */
  startDate: string;
  /** Optional end date "YYYY-MM-DD". */
  endDate: string | null;
  mealInstruction: Meal;
  notes: string;
  reminderEnabled: boolean;
  paused: boolean;
  createdAt: string;
}

export interface Dose {
  id: string;
  medicineId: string;
  /** Snapshot so history survives medicine deletion/edits. */
  medicineName: string;
  dosageText: string;
  /** Local ISO timestamp, e.g. "2026-09-03T08:00:00". */
  scheduledAt: string;
  status: DoseStatus;
  /** ISO timestamp of the user action (taken/skipped). */
  actionAt: string | null;
  /** ISO timestamp when the reminder was first fired for this dose. */
  reminderSentAt: string | null;
}

export interface Snooze {
  id: string;
  doseId: string;
  /** Local ISO timestamp when the snoozed reminder should fire. */
  fireAt: string;
}

export interface AppSettings {
  onboarded: boolean;
  /** Master switch for reminders. */
  notificationsEnabled: boolean;
  /** Whether the OS notification permission has been asked at least once. */
  permissionAsked: boolean;
  /** Default snooze in minutes. */
  defaultSnooze: number;
  sound: boolean;
  vibration: boolean;
  theme: ThemePref;
}

export interface DB {
  version: number;
  medicines: Medicine[];
  doses: Dose[];
  snoozes: Snooze[];
  settings: AppSettings;
}

export const UNITS: { value: Unit; label: string }[] = [
  { value: "tablet", label: "Tablet" },
  { value: "capsule", label: "Capsule" },
  { value: "ml", label: "ml" },
  { value: "drops", label: "Drops" },
  { value: "spoon", label: "Spoon" },
  { value: "other", label: "Other" },
];

export const FREQUENCIES: { value: Frequency; label: string; times: number }[] = [
  { value: "once", label: "Once", times: 1 },
  { value: "daily", label: "Daily", times: 1 },
  { value: "twice", label: "Twice daily", times: 2 },
  { value: "thrice", label: "Three times daily", times: 3 },
  { value: "four", label: "Four times daily", times: 4 },
  { value: "custom", label: "Custom", times: 1 },
];

export const MEALS: { value: Meal; label: string }[] = [
  { value: "none", label: "No preference" },
  { value: "before", label: "Before food" },
  { value: "after", label: "After food" },
  { value: "with", label: "With food" },
  { value: "empty", label: "Empty stomach" },
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function parseLocalDateTime(dt: string): Date {
  // "YYYY-MM-DDTHH:MM[:SS]" parsed as local time
  const [datePart, timePart = "00:00:00"] = dt.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm, ss = 0] = timePart.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
}

export function localDateTimeStr(d: Date): string {
  const date = toDateStr(d);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${date}T${hh}:${mm}:${ss}`;
}

export function formatTime12(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTimeLong(dt: string): string {
  const d = parseLocalDateTime(dt);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateLong(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateMedium(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Relative label like "Today", "Tomorrow", "Tue, Sep 8". */
export function relativeDayLabel(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return "Today";
  if (dateStr === addDaysStr(today, 1)) return "Tomorrow";
  if (dateStr === addDaysStr(today, -1)) return "Yesterday";
  return formatDateMedium(dateStr);
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export function frequencyLabel(f: Frequency): string {
  return FREQUENCIES.find((x) => x.value === f)?.label ?? f;
}

export function mealLabel(m: Meal): string {
  return MEALS.find((x) => x.value === m)?.label ?? m;
}

export function dosageText(m: Pick<Medicine, "dosage" | "unit">): string {
  const u = UNITS.find((x) => x.value === m.unit)?.label.toLowerCase() ?? m.unit;
  return `${m.dosage} ${u}`.trim();
}

/* ------------------------------------------------------------------ */
/* Schedule generation                                                 */
/* ------------------------------------------------------------------ */

export const SCHEDULE_BACK_DAYS = 92;
export const SCHEDULE_FORWARD_DAYS = 92;

/**
 * How long after a dose's scheduled time it may still fire a reminder before
 * being considered missed. Must stay in sync with the scheduler's grace period.
 */
export const DOSE_GRACE_MS = 5 * 60_000;

/** Does this medicine have a scheduled dose on `dateStr` at `time`? */
export function isScheduledOn(m: Medicine, dateStr: string, time: string): boolean {
  if (dateStr < m.startDate) return false;
  if (m.endDate && dateStr > m.endDate) return false;
  if (m.frequency === "custom") {
    const day = parseLocalDate(dateStr).getDay();
    return m.days.includes(day) && m.times.includes(time);
  }
  if (m.frequency === "once") {
    return dateStr === m.startDate && m.times.includes(time);
  }
  return m.times.includes(time);
}

/**
 * Generates the dose records for one medicine inside the window.
 * Existing doses (identified by medicineId + scheduledAt) are preserved with
 * their current status, so re-syncing never resets history.
 */
export function generateDosesFor(
  m: Medicine,
  windowStart: string,
  windowEnd: string,
  existingByKey: Map<string, Dose>,
): Dose[] {
  const out: Dose[] = [];
  const start = windowStart < m.startDate ? m.startDate : windowStart;
  const end = m.endDate && m.endDate < windowEnd ? m.endDate : windowEnd;

  let d = start;
  let guard = 0;
  while (d <= end && guard < 400) {
    guard += 1;
    const day = parseLocalDate(d).getDay();
    const times =
      m.frequency === "custom"
        ? m.days.includes(day)
          ? m.times
          : []
        : m.frequency === "once"
          ? d === m.startDate
            ? m.times.slice(0, 1)
            : []
          : m.times;

    for (const t of times) {
      if (!t) continue;
      const scheduledAt = `${d}T${t}:00`;
      const key = `${m.id}|${scheduledAt}`;
      const existing = existingByKey.get(key);
      if (existing) {
        out.push(existing);
      } else if (!m.paused) {
        out.push({
          id: uid(),
          medicineId: m.id,
          medicineName: m.name,
          dosageText: dosageText(m),
          scheduledAt,
          status: "upcoming",
          actionAt: null,
          reminderSentAt: null,
        });
      }
    }
    d = addDaysStr(d, 1);
  }
  return out;
}

/**
 * Reconciles the dose store: regenerates the schedule window for every
 * medicine (preserving existing records), keeps orphaned history for deleted
 * medicines, and marks overdue upcoming doses as missed.
 */
export function syncDoses(db: DB): DB {
  const now = new Date();
  const nowMs = now.getTime();
  const nowDt = localDateTimeStr(now);
  const today = toDateStr(now);
  const windowStart = addDaysStr(today, -SCHEDULE_BACK_DAYS);
  const windowEnd = addDaysStr(today, SCHEDULE_FORWARD_DAYS);
  const windowEndDt = `${windowEnd}T23:59:59`;

  const medicineById = new Map(db.medicines.map((m) => [m.id, m]));
  const existingByKey = new Map<string, Dose>();
  const out: Dose[] = [];
  const seen = new Set<string>();

  // Pass 1: preserve orphaned history, suspended-medicine history, and past
  // records whose schedule changed after the fact. Collect still-scheduled
  // in-window doses for regeneration.
  for (const d of db.doses) {
    const key = `${d.medicineId}|${d.scheduledAt}`;
    const inWindow = d.scheduledAt >= windowStart && d.scheduledAt <= windowEndDt;
    const med = medicineById.get(d.medicineId);
    if (!med || !inWindow) {
      out.push(d); // deleted medicine or outside the regeneration window
      continue;
    }
    const isPast = d.scheduledAt <= nowDt;
    if (med.paused) {
      // Keep history (recorded doses and past ones); suspend upcoming future doses.
      if (isPast || d.status !== "upcoming") out.push(d);
      continue;
    }
    const stillScheduled = isScheduledOn(
      med,
      d.scheduledAt.slice(0, 10),
      d.scheduledAt.slice(11, 16),
    );
    if (stillScheduled) {
      existingByKey.set(key, d);
    } else if (isPast || d.status !== "upcoming") {
      // Keep history: past doses, or recorded doses (taken/skipped/missed)
      // even if their time hasn't passed yet and the schedule changed.
      out.push(d);
    }
  }

  // Regenerate the schedule window for active medicines.
  const generatedByKey = new Map<string, Dose>();
  for (const m of db.medicines) {
    if (m.paused) continue;
    for (const g of generateDosesFor(m, windowStart, windowEnd, existingByKey)) {
      generatedByKey.set(`${g.medicineId}|${g.scheduledAt}`, g);
    }
  }

  // Pass 2: place regenerated doses back in their original positions.
  for (const d of db.doses) {
    const key = `${d.medicineId}|${d.scheduledAt}`;
    const inWindow = d.scheduledAt >= windowStart && d.scheduledAt <= windowEndDt;
    const med = medicineById.get(d.medicineId);
    if (!med || !inWindow) continue; // handled in pass 1
    if (med.paused) continue; // handled in pass 1
    const stillScheduled = isScheduledOn(
      med,
      d.scheduledAt.slice(0, 10),
      d.scheduledAt.slice(11, 16),
    );
    if (stillScheduled) {
      out.push(generatedByKey.get(key) ?? d);
      seen.add(key);
    }
  }

  // Append brand-new doses (added to the schedule since last sync).
  for (const g of generatedByKey.values()) {
    const key = `${g.medicineId}|${g.scheduledAt}`;
    if (!seen.has(key)) out.push(g);
  }

  // Mark overdue upcoming doses as missed — but only after the reminder grace
  // window has passed, so a dose that is a minute late still fires its reminder
  // instead of silently becoming missed. Doses with an active snooze wait for
  // the snoozed reminder. Paused medicines are never marked missed (their
  // future schedule is suspended, not failed).
  const snoozedDoseIds = new Set(db.snoozes.map((s) => s.doseId));
  let changed = false;
  for (const d of out) {
    if (d.status !== "upcoming") continue;
    const med = medicineById.get(d.medicineId);
    if (med?.paused) continue;
    if (snoozedDoseIds.has(d.id)) continue;
    if (nowMs - parseLocalDateTime(d.scheduledAt).getTime() > DOSE_GRACE_MS) {
      d.status = "missed";
      changed = true;
    }
  }

  if (
    !changed &&
    out.length === db.doses.length &&
    out.every((d, i) => d === db.doses[i])
  ) {
    return db;
  }

  return { ...db, doses: out };
}

/** True when a medicine has no more upcoming doses and at least one record. */
export function isMedicineCompleted(m: Medicine, doses: Dose[]): boolean {
  const hasUpcoming = doses.some(
    (d) => d.medicineId === m.id && d.status === "upcoming",
  );
  const hasAny = doses.some((d) => d.medicineId === m.id);
  return !hasUpcoming && hasAny;
}

export function nextUpcomingDose(
  m: Medicine,
  doses: Dose[],
  from: Date,
): Dose | null {
  const fromMs = from.getTime();
  let best: Dose | null = null;
  for (const d of doses) {
    if (d.medicineId !== m.id || d.status !== "upcoming") continue;
    const t = parseLocalDateTime(d.scheduledAt).getTime();
    if (t >= fromMs && (!best || t < parseLocalDateTime(best.scheduledAt).getTime())) {
      best = d;
    }
  }
  return best;
}

/** Closest upcoming dose across all medicines (for "Next reminder"). */
export function nextReminder(db: DB): Dose | null {
  const now = new Date();
  const meds = new Set(
    db.medicines
      .filter((m) => !m.paused && m.reminderEnabled)
      .map((m) => m.id),
  );
  let best: Dose | null = null;
  for (const d of db.doses) {
    if (d.status !== "upcoming" || !meds.has(d.medicineId)) continue;
    const t = parseLocalDateTime(d.scheduledAt).getTime();
    if (t >= now.getTime() && (!best || t < parseLocalDateTime(best.scheduledAt).getTime())) {
      best = d;
    }
  }
  return best;
}