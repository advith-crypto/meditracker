/**
 * MediTracker — reminder event bus, chime and system notification helpers.
 *
 * The scheduler lives in ReminderProvider; this module is the channel between
 * the scheduler and the in-app reminder panel, plus the platform bits
 * (Web Audio chime, vibration, OS notifications) that the panel needs.
 */

export interface ReminderEvent {
  id: string;
  doseId: string;
  medicineName: string;
  dosageText: string;
  /** 12h label like "8:00 AM". */
  timeLabel: string;
  /** Whether this event came from a snoozed reminder. */
  snoozed: boolean;
}

const listeners = new Set<(events: ReminderEvent[]) => void>();
let active: ReminderEvent[] = [];

function emit() {
  for (const l of listeners) l(active);
}

export function subscribeReminders(cb: (events: ReminderEvent[]) => void): () => void {
  listeners.add(cb);
  cb(active);
  return () => {
    listeners.delete(cb);
  };
}

export function pushReminder(ev: ReminderEvent): void {
  if (active.some((e) => e.doseId === ev.doseId)) return;
  active = [...active, ev];
  emit();
}

export function removeReminder(eventId: string): void {
  active = active.filter((e) => e.id !== eventId);
  emit();
}

/** Removes alerts whose dose no longer exists (deleted or rescheduled). */
export function pruneReminders(liveDoseIds: Set<string>): void {
  const next = active.filter((e) => liveDoseIds.has(e.doseId));
  if (next.length !== active.length) {
    active = next;
    emit();
  }
}

/* ------------------------------------------------------------------ */
/* Sound & vibration                                                   */
/* ------------------------------------------------------------------ */

let audioCtx: AudioContext | null = null;

/** Soft two-tone chime generated with Web Audio — no asset needed. */
export function playChime(): void {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const now = audioCtx.currentTime;
    const notes = [880, 1108.7]; // A5, C#6 — gentle, calm
    notes.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx!.destination);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    });
  } catch {
    /* audio unavailable — reminder still shows in the UI */
  }
}

export function vibrate(): void {
  try {
    if ("vibrate" in navigator) navigator.vibrate([180, 90, 180]);
  } catch {
    /* not supported */
  }
}

/* ------------------------------------------------------------------ */
/* OS notification permission                                          */
/* ------------------------------------------------------------------ */

export type PermissionState = "granted" | "denied" | "default" | "unsupported";

export function notificationPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Requests permission. Returns the resulting state. `userInitiated` should be
 * true when called from a button click — browsers only honour the prompt from
 * a user gesture (and auto-requests are ignored after the first denial).
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!notificationsSupported()) return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result as PermissionState;
  } catch {
    return "default";
  }
}

/** Fires an OS-level notification when permitted. */
export function fireSystemNotification(
  medicineName: string,
  dosageText: string,
  doseId: string,
): void {
  if (!notificationsSupported() || notificationPermission() !== "granted") return;
  try {
    const n = new Notification("MediTracker", {
      body: `It's time to take ${medicineName} — ${dosageText}.`,
      tag: `dose-${doseId}`,
      icon: "/logo.svg",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* some platforms throw without a service worker — the in-app alert covers it */
  }
}