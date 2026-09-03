import { motion } from "framer-motion";
import {
  Bell,
  BellOff,
  History,
  Home,
  Pill,
  Plus,
  Settings,
} from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { useDB } from "@/lib/store";
import { notificationPermission } from "@/lib/reminders";
import { ReminderProvider } from "@/components/ReminderProvider";

const NAV = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/medicines", label: "Medicines", icon: Pill, end: false },
  { to: "/app/history", label: "History", icon: History, end: false },
  { to: "/app/settings", label: "Settings", icon: Settings, end: false },
];

function Logo() {
  return (
    <NavLink to="/app" className="flex items-center gap-2.5" aria-label="MediReminder home">
      <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
        <Pill className="size-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">MediReminder</span>
    </NavLink>
  );
}

export default function AppShell() {
  const db = useDB();
  const location = useLocation();
  const navigate = useNavigate();
  const perm = notificationPermission();

  if (!db.settings.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <ReminderProvider />

      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-background md:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={() => navigate("/app/medicines/new")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Add medicine
          </button>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Reminders and tracking only — not medical advice.
          </p>
        </div>
      </aside>

      {/* ---------- Mobile header ---------- */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur md:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo />
          <button
            type="button"
            onClick={() => navigate("/app/settings")}
            className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Notification settings"
          >
            {perm === "granted" ? (
              <Bell className="size-5" />
            ) : (
              <BellOff className="size-5" />
            )}
            {perm !== "granted" && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
            )}
          </button>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <div className="md:pl-64">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 md:px-8 md:pb-16 md:pt-10"
        >
          <Outlet />
        </motion.main>
      </div>

      {/* ---------- Floating add button (mobile) ---------- */}
      <button
        type="button"
        onClick={() => navigate("/app/medicines/new")}
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg shadow-black/15 transition-transform active:scale-95 md:hidden"
        aria-label="Add medicine"
      >
        <Plus className="size-6" />
      </button>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-colors",
                      isActive && "bg-secondary",
                    )}
                  >
                    <item.icon className="size-[18px]" />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}