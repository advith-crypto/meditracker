/**
 * MediTracker — persistent local store backed by localStorage.
 *
 * The whole database is one versioned JSON blob so writes are atomic and a
 * single quota failure is easy to surface. All mutations go through `mutate`,
 * which clones, applies the change, persists, and notifies subscribers only
 * when something actually changed.
 */
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  type AppSettings,
  type DB,
  type Dose,
  type DoseStatus,
  type Medicine,
  type Medicine as MedicineT,
  localDateTimeStr,
  syncDoses,
  uid,
} from "./medicines";

const STORAGE_KEY = "medireminder:v1";
const DB_VERSION = 1;

function localDateToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const DEFAULT_SETTINGS: AppSettings = {
  onboarded: false,
  notificationsEnabled: true,
  permissionAsked: false,
  defaultSnooze: 30,
  sound: true,
  vibration: true,
  theme: "system",
};

export function defaultDB(): DB {
  return {
    version: DB_VERSION,
    medicines: [],
    doses: [],
    snoozes: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/* ------------------------------------------------------------------ */
/* Loading & sanitizing                                                */
/* ------------------------------------------------------------------ */

function sanitizeDB(raw: unknown): DB {
  const base = defaultDB();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<DB>;

  const settings: AppSettings = {
    ...base.settings,
    ...(typeof r.settings === "object" && r.settings ? (r.settings as Partial<AppSettings>) : {}),
  };
  settings.onboarded = Boolean(settings.onboarded);
  settings.notificationsEnabled = settings.notificationsEnabled !== false;
  settings.sound = settings.sound !== false;
  settings.vibration = settings.vibration !== false;
  settings.defaultSnooze = [10, 30, 60].includes(settings.defaultSnooze)
    ? settings.defaultSnooze
    : 30;
  settings.theme = ["light", "dark", "system"].includes(settings.theme as string)
    ? settings.theme
    : "system";

  const medicines: Medicine[] = Array.isArray(r.medicines)
    ? r.medicines
        .filter(
          (m): m is Medicine =>
            !!m &&
            typeof m === "object" &&
            typeof (m as Medicine).id === "string" &&
            typeof (m as Medicine).name === "string",
        )
        .map((m) => ({
          id: m.id,
          name: String(m.name).slice(0, 120),
          dosage: String(m.dosage ?? "").slice(0, 40),
          unit: ["tablet", "capsule", "ml", "drops", "spoon", "other"].includes(m.unit)
            ? m.unit
            : "tablet",
          frequency: ["once", "daily", "twice", "thrice", "four", "custom"].includes(
            m.frequency,
          )
            ? m.frequency
            : "daily",
          times: Array.isArray(m.times)
            ? m.times.filter((t): t is string => typeof t === "string" && !!t).slice(0, 12)
            : [],
          days: Array.isArray(m.days)
            ? m.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6).slice(0, 7)
            : [],
          startDate: /^\d{4}-\d{2}-\d{2}$/.test(m.startDate || "")
            ? m.startDate
            : localDateToday(),
          endDate:
            m.endDate && /^\d{4}-\d{2}-\d{2}$/.test(m.endDate) ? m.endDate : null,
          mealInstruction: ["none", "before", "after", "with", "empty"].includes(
            m.mealInstruction,
          )
            ? m.mealInstruction
            : "none",
          notes: String(m.notes ?? "").slice(0, 1000),
          reminderEnabled: m.reminderEnabled !== false,
          paused: Boolean(m.paused),
          createdAt:
            typeof m.createdAt === "string" ? m.createdAt : new Date().toISOString(),
        }))
    : [];

  const doseSet = new Set<string>();
  const doses: Dose[] = Array.isArray(r.doses)
    ? r.doses
        .filter((d): d is Dose => !!d && typeof d === "object" && typeof d.id === "string")
        .map((d) => ({
          id: d.id,
          medicineId: String(d.medicineId ?? ""),
          medicineName: String(d.medicineName ?? "").slice(0, 120),
          dosageText: String(d.dosageText ?? "").slice(0, 60),
          scheduledAt: typeof d.scheduledAt === "string" ? d.scheduledAt : "",
          status: ["upcoming", "taken", "skipped", "missed"].includes(d.status)
            ? d.status
            : "upcoming",
          actionAt: typeof d.actionAt === "string" ? d.actionAt : null,
          reminderSentAt: typeof d.reminderSentAt === "string" ? d.reminderSentAt : null,
        }))
        .filter((d) => {
          if (!d.scheduledAt || !d.medicineId) return false;
          const key = `${d.medicineId}|${d.scheduledAt}`;
          if (doseSet.has(key)) return false;
          doseSet.add(key);
          return true;
        })
    : [];

  const snoozes = Array.isArray(r.snoozes)
    ? r.snoozes
        .filter(
          (s): s is { id: string; doseId: string; fireAt: string } =>
            !!s && typeof s.id === "string" && typeof s.doseId === "string",
        )
        .map((s) => ({
          id: s.id,
          doseId: s.doseId,
          fireAt: typeof s.fireAt === "string" ? s.fireAt : "",
        }))
        .filter((s) => !!s.fireAt)
        .slice(0, 100)
    : [];

  return { version: DB_VERSION, medicines, doses, snoozes, settings };
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDB();
    return sanitizeDB(JSON.parse(raw));
  } catch (err) {
    console.warn("[MediTracker] Could not read stored data, starting fresh.", err);
    return defaultDB();
  }
}

/* ------------------------------------------------------------------ */
/* Store plumbing                                                      */
/* ------------------------------------------------------------------ */

let db: DB = loadDB();
/** Serialized snapshot used to skip redundant writes/re-renders. */
let lastJson: string | null = JSON.stringify(db);
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getDB(): DB {
  return db;
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB, getDB);
}

function cloneDB(source: DB): DB {
  return {
    version: source.version,
    medicines: source.medicines.map((m) => ({ ...m, times: [...m.times], days: [...m.days] })),
    doses: source.doses.map((d) => ({ ...d })),
    snoozes: source.snoozes.map((s) => ({ ...s })),
    settings: { ...source.settings },
  };
}

/** Applies `fn` to a clone, persists, and notifies subscribers. */
export function mutate(fn: (draft: DB) => DB): void {
  const draft = cloneDB(db);
  const next = fn(draft);
  const json = JSON.stringify(next);
  if (json === lastJson) return; // nothing actually changed
  try {
    localStorage.setItem(STORAGE_KEY, json);
    lastJson = json;
  } catch (err) {
    console.error("[MediTracker] Failed to persist data:", err);
    toast.error("Your data could not be saved. Please try again.");
    return;
  }
  db = next;
  emit();
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export type MedicineInput = Omit<
  MedicineT,
  "id" | "createdAt" | "paused" | "reminderEnabled"
> & { reminderEnabled?: boolean };

function buildMedicine(input: MedicineInput): Medicine {
  return {
    ...input,
    times: input.times.filter((t) => !!t),
    reminderEnabled: input.reminderEnabled !== false,
    paused: false,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
}

export function actionAddMedicine(input: MedicineInput): Medicine | null {
  const m = buildMedicine(input);
  mutate((draft) => {
    draft.medicines.push(m);
    return syncDoses(draft);
  });
  return getDB().medicines.find((x) => x.id === m.id) ? m : null;
}

export function actionUpdateMedicine(id: string, input: MedicineInput): void {
  mutate((draft) => {
    const idx = draft.medicines.findIndex((m) => m.id === id);
    if (idx === -1) return draft;
    draft.medicines[idx] = {
      ...draft.medicines[idx],
      ...input,
      times: input.times.filter((t) => !!t),
      id,
    };
    return syncDoses(draft);
  });
}

export function actionToggleMedicineReminder(id: string): void {
  mutate((draft) => {
    const m = draft.medicines.find((x) => x.id === id);
    if (!m) return draft;
    m.reminderEnabled = !m.reminderEnabled;
    return draft;
  });
}

/**
 * Pause: stops future reminders and removes already-generated future doses.
 * Resume: regenerates the schedule from today onward.
 */
export function actionSetPaused(id: string, paused: boolean): void {
  const nowMs = Date.now();
  mutate((draft) => {
    const m = draft.medicines.find((x) => x.id === id);
    if (!m) return draft;
    m.paused = paused;
    if (paused) {
      // Keep recorded history (taken/skipped/missed and past doses); drop
      // upcoming doses that have not happened yet so reminders stop.
      draft.doses = draft.doses.filter((d) => {
        if (d.medicineId !== id) return true;
        if (d.status !== "upcoming") return true;
        return new Date(d.scheduledAt.replace(" ", "T")).getTime() < nowMs;
      });
      draft.snoozes = draft.snoozes.filter((s) => {
        const dose = draft.doses.find((d) => d.id === s.doseId);
        return dose && dose.medicineId !== id;
      });
    }
    return syncDoses(draft);
  });
}

export function actionDeleteMedicine(id: string): void {
  const nowMs = Date.now();
  mutate((draft) => {
    draft.medicines = draft.medicines.filter((m) => m.id !== id);
    // Keep historical records; drop upcoming future doses (cancel reminders).
    draft.doses = draft.doses.filter((d) => {
      if (d.medicineId !== id) return true;
      const isFuture = d.status === "upcoming"
        && new Date(d.scheduledAt.replace(" ", "T")).getTime() > nowMs;
      return !isFuture;
    });
    draft.snoozes = draft.snoozes.filter((s) => {
      const dose = draft.doses.find((d) => d.id === s.doseId);
      // Drop snoozes whose dose was removed; keep snoozes for other medicines.
      return dose !== undefined && dose.medicineId !== id;
    });
    return draft;
  });
}

export function actionMarkDose(doseId: string, status: Exclude<DoseStatus, "upcoming">): void {
  const nowIso = new Date().toISOString();
  mutate((draft) => {
    const d = draft.doses.find((x) => x.id === doseId);
    if (!d || d.status === status) return draft;
    d.status = status;
    d.actionAt = nowIso;
    draft.snoozes = draft.snoozes.filter((s) => s.doseId !== doseId);
    return draft;
  });
}

export function actionSnoozeDose(doseId: string, minutes: number): void {
  const fireAt = localDateTimeStr(new Date(Date.now() + minutes * 60_000));
  mutate((draft) => {
    // Replace any existing snooze for the same dose (no duplicates).
    draft.snoozes = draft.snoozes.filter((s) => s.doseId !== doseId);
    draft.snoozes.push({ id: uid(), doseId, fireAt });
    return draft;
  });
}

export function actionDismissSnooze(snoozeId: string): void {
  mutate((draft) => {
    draft.snoozes = draft.snoozes.filter((s) => s.id !== snoozeId);
    return draft;
  });
}

export function actionUpdateSettings(patch: Partial<AppSettings>): void {
  mutate((draft) => {
    draft.settings = { ...draft.settings, ...patch };
    return draft;
  });
}

export function actionCompleteOnboarding(): void {
  mutate((draft) => {
    draft.settings.onboarded = true;
    return draft;
  });
}

export function actionClearHistory(): void {
  mutate((draft) => {
    draft.doses = [];
    draft.snoozes = [];
    return draft;
  });
}

export function actionDeleteAllMedicines(): void {
  mutate((draft) => {
    draft.medicines = [];
    draft.doses = [];
    draft.snoozes = [];
    return draft;
  });
}

export function actionAddSampleData(): void {
  const today = localDateToday();
  const first = buildMedicine({
    name: "Paracetamol",
    dosage: "500 mg",
    unit: "tablet",
    frequency: "daily",
    times: ["08:00"],
    days: [],
    startDate: today,
    endDate: null,
    mealInstruction: "after",
    notes: "Sample medicine — for demonstration only.",
    reminderEnabled: true,
  });
  const second = buildMedicine({
    name: "Vitamin D",
    dosage: "1",
    unit: "tablet",
    frequency: "daily",
    times: ["13:00"],
    days: [],
    startDate: today,
    endDate: null,
    mealInstruction: "with",
    notes: "Sample medicine — for demonstration only.",
    reminderEnabled: true,
  });
  mutate((draft) => {
    draft.medicines.push(first, second);
    return syncDoses(draft);
  });
  toast.success("Sample data added", {
    description: "Sample medicines are for demonstration only — not medical recommendations.",
  });
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export function exportData(): { ok: boolean } {
  try {
    const payload = {
      app: "MediTracker",
      exportedAt: new Date().toISOString(),
      medicines: db.medicines,
      doses: db.doses,
      settings: db.settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meditracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { ok: true };
  } catch (err) {
    console.error("[MediTracker] Export failed:", err);
    return { ok: false };
  }
}