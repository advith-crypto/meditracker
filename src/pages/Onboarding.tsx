import { AnimatePresence, motion } from "framer-motion";
import { Bell, CalendarClock, Pill, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/reminders";
import {
  actionCompleteOnboarding,
  actionUpdateSettings,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Bell,
    title: "Never miss a medicine reminder.",
    body: "MediReminder keeps your daily medicines organized and reminds you when it’s time to take them.",
  },
  {
    icon: Pill,
    title: "Add your medicines and schedules.",
    body: "Set doses, reminder times, meal instructions and notes for each medicine you take.",
  },
  {
    icon: CalendarClock,
    title: "Get reminders and track every dose.",
    body: "Mark each dose as taken or skipped, and see your history and adherence at a glance.",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [requesting, setRequesting] = useState(false);

  const finish = () => {
    actionCompleteOnboarding();
    navigate("/app", { replace: true });
  };

  const handleEnable = async () => {
    if (requesting) return;
    setRequesting(true);
    if (notificationsSupported()) {
      await requestNotificationPermission();
    }
    actionUpdateSettings({ permissionAsked: true });
    setRequesting(false);
    finish();
  };

  const handleSkip = () => {
    actionUpdateSettings({ permissionAsked: true });
    finish();
  };

  const isPermissionStep = step === STEPS.length;
  const permission = notificationPermission();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Pill className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">MediReminder</span>
        </div>
        {!isPermissionStep && (
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Skip
          </button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {!isPermissionStep ? (
              <div className="text-center">
                <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-3xl border border-border bg-secondary">
                  {(() => {
                    const Icon = STEPS[step].icon;
                    return <Icon className="size-9 text-foreground" />;
                  })()}
                </div>
                <h1 className="text-3xl font-semibold leading-tight tracking-tight">
                  {STEPS[step].title}
                </h1>
                <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                  {STEPS[step].body}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-3xl border border-border bg-secondary">
                  <Bell className="size-9 text-foreground" />
                </div>
                <h1 className="text-3xl font-semibold leading-tight tracking-tight">
                  Enable notifications
                </h1>
                <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                  MediReminder needs notification permission to remind you when
                  it’s time to take your medicine.
                </p>

                {permission === "denied" && (
                  <p className="mx-auto mt-5 max-w-sm rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                    Notifications are currently disabled in your browser. You can
                    still track your medicines — enable notifications later from
                    Settings.
                  </p>
                )}

                <div className="mt-8 flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="h-12 w-full text-base"
                    onClick={handleEnable}
                    disabled={requesting || permission === "denied"}
                  >
                    {requesting ? "Requesting…" : "Enable notifications"}
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-12 w-full text-base"
                    onClick={handleSkip}
                  >
                    Not now
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto w-full max-w-md px-6 pb-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4"
          >
            Back
          </Button>

          {!isPermissionStep && (
            <div className="flex items-center gap-2" aria-hidden>
              {[...Array(STEPS.length)].map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-foreground" : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>
          )}

          {!isPermissionStep ? (
            <Button
              onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              className="px-6"
            >
              {step === STEPS.length - 1 ? "Get Started" : "Next"}
            </Button>
          ) : (
            <div className="w-20" />
          )}
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Your data stays on this device. No account needed.
        </p>
      </footer>
    </div>
  );
}