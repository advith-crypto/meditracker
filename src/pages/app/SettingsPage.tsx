import {
  Bell,
  Download,
  FlaskConical,
  Info,
  Moon,
  Pill,
  ShieldCheck,
  Sun,
  Trash2,
  Monitor,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SectionHeading } from "@/components/status";
import type { ThemePref } from "@/lib/medicines";
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/reminders";
import {
  actionAddSampleData,
  actionClearHistory,
  actionDeleteAllMedicines,
  actionUpdateSettings,
  exportData,
  useDB,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const APP_VERSION = "1.0.0";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function Section({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("border-border shadow-none", className)}>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function Row({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-medium leading-snug">{title}</p>
          {description && (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const db = useDB();
  const s = db.settings;
  const perm = notificationPermission();

  const [confirm, setConfirm] = useState<
    "clearHistory" | "deleteAll" | null
  >(null);

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installed, setInstalled] = useState(detectStandalone());

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      toast.success("MediTracker installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
    } else {
      setShowInstallHelp(true);
    }
  };

  const themeOptions: { value: ThemePref; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const handleExport = () => {
    const res = exportData();
    if (res.ok) toast.success("History exported");
    else toast.error("Export failed. Please try again.");
  };

  const handlePermission = async () => {
    if (!notificationsSupported()) {
      toast.info("This browser does not support notifications.");
      return;
    }
    await requestNotificationPermission();
    actionUpdateSettings({ permissionAsked: true });
    toast.success("Notification permission updated");
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reminders, appearance, data and privacy.
        </p>
      </header>

      {/* Notifications */}
      <section className="space-y-3">
        <SectionHeading title="Notifications" />
        <Section>
          <div className="divide-y divide-border">
            <Row
              icon={<Bell className="size-4" />}
              title="Reminders"
              description="Master switch for all medicine reminders."
            >
              <Switch
                checked={s.notificationsEnabled}
                onCheckedChange={(v) =>
                  actionUpdateSettings({ notificationsEnabled: v })
                }
                aria-label="Enable reminders"
              />
            </Row>
            <Row
              title="Default snooze"
              description="How long to wait before reminding again."
            >
              <Select
                value={String(s.defaultSnooze)}
                onValueChange={(v) =>
                  actionUpdateSettings({ defaultSnooze: Number(v) })
                }
              >
                <SelectTrigger className="w-28 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row
              title="Sound"
              description="Play a gentle tone when a reminder appears."
            >
              <Switch
                checked={s.sound}
                onCheckedChange={(v) => actionUpdateSettings({ sound: v })}
                aria-label="Reminder sound"
              />
            </Row>
            <Row
              title="Vibration"
              description="Vibrate when a reminder appears (supported devices)."
            >
              <Switch
                checked={s.vibration}
                onCheckedChange={(v) => actionUpdateSettings({ vibration: v })}
                aria-label="Reminder vibration"
              />
            </Row>
            <Row
              title="Notification permission"
              description={
                perm === "granted"
                  ? "Granted — system notifications are enabled."
                  : perm === "denied"
                    ? "Blocked by your browser. Enable it in your browser settings."
                    : perm === "unsupported"
                      ? "This browser does not support notifications."
                      : "Not requested yet."
              }
            >
              {perm !== "granted" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePermission}
                  disabled={perm === "unsupported"}
                >
                  {perm === "denied" ? "Try again" : "Enable"}
                </Button>
              )}
            </Row>
          </div>
        </Section>
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          Reminders appear as in-app alerts and system notifications while
          MediTracker is open in this browser. Browsers cannot deliver reminders
          after the app is closed, so keep MediTracker open when you expect a
          reminder.
        </p>
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <SectionHeading title="Appearance" />
        <Section>
          <div className="divide-y divide-border">
            <Row
              icon={<Sun className="size-4" />}
              title="Theme"
              description="Choose how MediTracker looks."
            >
              <div className="flex rounded-lg border border-border bg-background p-0.5">
                {themeOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={s.theme === o.value}
                    onClick={() => actionUpdateSettings({ theme: o.value })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      s.theme === o.value
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <o.icon className="size-3.5" />
                    {o.label}
                  </button>
                ))}
              </div>
            </Row>
          </div>
        </Section>
      </section>

      {/* App */}
      <section className="space-y-3">
        <SectionHeading title="App" />
        <Section>
          <div className="divide-y divide-border">
            <Row
              icon={<Download className="size-4" />}
              title="Download app"
              description={
                installed
                  ? "MediTracker is installed on this device."
                  : installPrompt
                    ? "Install MediTracker on this device. It opens like a native app and works offline."
                    : "Add MediTracker to your home screen to use it like a native app."
              }
            >
              {!installed ? (
                <Button size="sm" variant="outline" onClick={handleInstall}>
                  {installPrompt ? "Install" : "How to install"}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Installed</span>
              )}
            </Row>
          </div>
        </Section>
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          Installed apps keep reminders working the same way as the browser —
          alerts appear while MediTracker is open. Your data stays on this
          device either way.
        </p>
      </section>

      {/* Data */}
      <section className="space-y-3">
        <SectionHeading title="Data" />
        <Section>
          <div className="divide-y divide-border">
            <Row
              icon={<Download className="size-4" />}
              title="Export history"
              description="Download all medicines and dose records as a JSON file."
            >
              <Button size="sm" variant="outline" onClick={handleExport}>
                Export
              </Button>
            </Row>
            <Row
              icon={<FlaskConical className="size-4" />}
              title="Add sample data"
              description="Demo medicines for trying the app. Not medical recommendations."
            >
              <Button
                size="sm"
                variant="outline"
                onClick={() => actionAddSampleData()}
              >
                Add sample
              </Button>
            </Row>
            <Row
              icon={<Trash2 className="size-4" />}
              title="Clear history"
              description="Remove all dose records. Medicines are kept."
            >
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirm("clearHistory")}
              >
                Clear
              </Button>
            </Row>
            <Row
              icon={<Trash2 className="size-4" />}
              title="Delete all medicines"
              description="Removes every medicine and all dose records."
            >
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirm("deleteAll")}
              >
                Delete all
              </Button>
            </Row>
          </div>
        </Section>
      </section>

      {/* About */}
      <section className="space-y-3">
        <SectionHeading title="About" />
        <Section>
          <div className="divide-y divide-border">
            <div className="flex items-center gap-4 px-5 py-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
                <Pill className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">MediTracker</p>
                <p className="text-sm text-muted-foreground">
                  Version {APP_VERSION}
                </p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  A friendly daily medicine reminder and tracking app. Built for
                  you — simple enough for everyday use.
                </p>
              </div>
            </div>
            <Row
              icon={<ShieldCheck className="size-4" />}
              title="Privacy"
              description="All data is stored locally on this device in your browser. No account is required and no medicine information is sent anywhere."
            />
            <Row
              icon={<Info className="size-4" />}
              title="Medical disclaimer"
              description="This app is intended for medication reminders and tracking only. It does not provide medical advice, diagnosis, or treatment recommendations. Always follow the instructions provided by your doctor or pharmacist."
            />
          </div>
        </Section>
      </section>

      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "clearHistory"
                ? "Clear all history?"
                : "Delete all medicines?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "clearHistory"
                ? "This removes every dose record. Your medicines and schedules are kept."
                : "This removes all medicines and every dose record. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (confirm === "clearHistory") {
                  actionClearHistory();
                  toast.success("History cleared");
                } else {
                  actionDeleteAllMedicines();
                  toast.success("All medicines deleted");
                }
                setConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showInstallHelp}
        onOpenChange={(open) => !open && setShowInstallHelp(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download MediTracker</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 text-left text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    Android (Chrome)
                  </p>
                  <p>
                    Open the browser menu (⋮) and choose “Add to Home screen”.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    iPhone or iPad (Safari)
                  </p>
                  <p>Tap Share, then “Add to Home Screen”.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Desktop (Chrome or Edge)
                  </p>
                  <p>
                    Use the install icon in the address bar, or the browser
                    menu → “Install MediTracker”.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}