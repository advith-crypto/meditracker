# MediTracker

A simple, private, mobile-first daily medicine reminder and tracking app.

MediTracker reminds you when it's time to take your medicines and lets you track
each dose as **Taken**, **Skipped** or **Missed** — with a complete history and
simple adherence stats. It is a reminder and tracking tool only: it does not
provide medical advice, diagnosis, or treatment recommendations.

## Highlights

- **No account, no backend, no internet needed.** Everything — medicines, dose
  records, settings — is stored in `localStorage` on the device. The app works
  fully offline after the initial page loads.
- **Onboarding** (3 quick screens + optional notification permission) on first
  launch, skippable.
- **Home dashboard** — greeting, today's progress ring, today's schedule with
  one-tap Taken/Skip, next reminder, permission banner.
- **My Medicines** — instant search by name/dosage, All/Active/Paused/Completed
  filters, and per-card View / Edit / Pause-Resume / Delete.
- **Add/Edit Medicine** — name, dosage, unit, frequency presets (once, daily,
  twice/thrice/four times daily, custom weekdays), multiple reminder times,
  start/end dates, meal instruction, notes, reminder toggle — with friendly
  validation.
- **History & Statistics** — Today/Yesterday/Last 7/Last 30/Custom filters,
  grouped records, adherence percentage, and a 7-day activity chart.
- **Settings** — reminder toggles (master switch, default snooze, sound,
  vibration, notification permission), Light/Dark/System theme, export JSON,
  sample data, clear history, delete all medicines, and the medical disclaimer.
- **Reminders** — while the app is open, a scheduler fires in-app alerts plus
  system notifications (when permitted) with Taken / Skip / Snooze (10/30/60
  minutes) actions, sound and vibration. Doses that pass unrecorded are marked
  Missed. Browsers cannot deliver notifications when the app is closed — this
  limitation is stated honestly in the app.
- **Minimalism design** — near-monochrome palette, generous whitespace, hairline
  dividers, large touch targets, light and dark mode.

## Tech stack

- Vite + React 19 + TypeScript
- React Router v7 (imports from `react-router`)
- Tailwind CSS v4 + shadcn/ui components
- Lucide icons, Framer Motion, Sonner toasts
- Bun (package manager)

## Project structure

```
src/
  lib/medicines.ts        # Domain types, date/time helpers, dose generation & sync
  lib/store.ts            # localStorage persistence, store hook, all actions
  lib/reminders.ts        # Reminder event bus, chime, system notifications
  components/AppShell.tsx # App layout: mobile bottom nav, desktop sidebar, FAB
  components/ReminderProvider.tsx  # Scheduler ticker + in-app reminder panel
  components/status.tsx   # Status badges, progress ring, section headings
  pages/Landing.tsx       # Marketing landing page
  pages/Onboarding.tsx    # First-run onboarding + notification permission
  pages/app/*             # Home, Medicines, Medicine form/detail, History, Settings
  main.tsx                # Router + theme + toaster wiring
```

## Data model (all local)

- **Medicine** — name, dosage, unit, frequency, reminder times, selected days,
  start/end dates, meal instruction, notes, reminder enabled, paused, created.
- **Dose** — one record per scheduled occurrence with medicine name/dosage
  snapshots, scheduled time, status (`upcoming | taken | skipped | missed`),
  action timestamp. Dose history survives medicine deletion and edits.
- **Settings** — onboarded, notifications enabled, default snooze, sound,
  vibration, theme.

Schedules are generated for a rolling window (~3 months back, 3 months ahead)
and reconciled on load; overdue upcoming doses become Missed automatically.

## Commands

```bash
bun install        # install dependencies
bun tsc -b --noEmit  # typecheck
bun run dev        # dev server
```

## Disclaimer

This app is intended for medication reminders and tracking only. It does not
provide medical advice, diagnosis, or treatment recommendations. Always follow
the instructions provided by your doctor or pharmacist.