import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  History,
  Lock,
  Pill,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useDB } from "@/lib/store";

const STEPS = [
  {
    icon: Pill,
    title: "Add your medicines",
    body: "Name, dosage, reminder times, meal instructions and notes — set up in under a minute.",
  },
  {
    icon: Bell,
    title: "Get a friendly nudge",
    body: "Clear alerts when a dose is due, with one-tap taken, skip and snooze actions.",
  },
  {
    icon: History,
    title: "Track every dose",
    body: "A complete history and simple adherence stats — taken, skipped or missed.",
  },
];

const FEATURES = [
  {
    icon: CalendarClock,
    title: "Flexible schedules",
    body: "Daily, several times a day, or custom days of the week with multiple reminder times.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Everything is stored locally on your device. No tracking, no cloud, no fuss.",
  },
  {
    icon: Check,
    title: "Simple and clear",
    body: "Large touch targets, readable type and a calm design that’s easy for everyone.",
  },
];

function PhoneMock() {
  const items = [
    { name: "Paracetamol", dose: "500 mg tablet", time: "8:00 AM", status: "Taken" },
    { name: "Vitamin D", dose: "1 tablet", time: "1:00 PM", status: "Upcoming" },
    { name: "Blood pressure", dose: "5 ml", time: "8:00 PM", status: "Upcoming" },
  ];
  return (
    <div className="mx-auto w-[280px] rounded-[2.4rem] border border-border bg-card p-2.5 shadow-2xl shadow-black/10">
      <div className="rounded-[1.9rem] border border-border/70 bg-background p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Today’s schedule
          </p>
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
            <span className="size-1.5 rounded-full bg-foreground" /> 67%
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          {items.map((it) => (
            <div
              key={it.name}
              className="flex items-center gap-3 rounded-xl border border-border/70 p-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Pill className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{it.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {it.dose} · {it.time}
                </p>
              </div>
              <span
                className={
                  it.status === "Taken"
                    ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                    : "rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                }
              >
                {it.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const db = useDB();

  const openApp = () => {
    navigate(db.settings.onboarded ? "/app" : "/onboarding");
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Pill className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              MediTracker
            </span>
          </div>
          <Button onClick={openApp} className="h-10 px-5">
            Open app <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-5xl items-center gap-14 px-5 pb-24 pt-16 md:grid-cols-2 md:pb-32 md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Daily medicine reminders
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              Never miss
              <br />
              a dose again.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              MediTracker reminds you when it’s time to take your medicine, then
              tracks whether each dose was taken, skipped or missed — all in one
              calm, simple place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="h-12 px-7 text-base"
                onClick={openApp}
              >
                Get started <ArrowRight className="size-4" />
              </Button>
              <p className="text-sm text-muted-foreground">
                Free. No credit card. Set up in minutes.
              </p>
            </div>
            <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
              {[
                "No account or sign-up — just open the app",
                "Your data stays on your device",
                "Works on phones, tablets and desktop",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Check className="size-4 text-foreground" /> {t}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="md:justify-self-end"
          >
            <PhoneMock />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-20 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Three simple steps
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex gap-4 md:flex-col md:gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-5xl px-5 py-20 md:py-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Everything you need, nothing you don’t
              </h2>
            </div>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-background p-6"
              >
                <f.icon className="size-5 text-muted-foreground" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-20 md:py-24">
          <div className="flex flex-col items-start gap-6 rounded-3xl border border-border bg-card p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-lg">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                <Lock className="size-5" />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                Private by design
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                Your medicine information never leaves your device. MediTracker
                needs no account, collects no personal data, and never sends
                your medicines anywhere.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sparkles className="size-4" />
                No sign-up, no email, no waiting — it just works.
              </p>
            </div>
            <Button size="lg" variant="outline" className="h-12 shrink-0 px-6" onClick={openApp}>
              Open MediTracker <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl space-y-6 px-5 py-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
                <Pill className="size-3.5" />
              </span>
              <span className="text-sm font-semibold">MediTracker</span>
            </div>
            <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            This app is intended for medication reminders and tracking only. It
            does not provide medical advice, diagnosis, or treatment
            recommendations. Always follow the instructions provided by your
            doctor or pharmacist.
          </p>
        </div>
      </footer>
    </div>
  );
}