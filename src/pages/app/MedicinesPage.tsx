import {
  CalendarX2,
  CheckCircle2,
  MoreVertical,
  Pause,
  Pencil,
  Pill,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  type Medicine,
  dosageText,
  frequencyLabel,
  isMedicineCompleted,
  nextUpcomingDose,
  relativeDayLabel,
  todayStr,
} from "@/lib/medicines";
import {
  actionAddSampleData,
  actionDeleteMedicine,
  actionSetPaused,
  useDB,
} from "@/lib/store";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "paused" | "completed";

function nextLabel(m: Medicine, db: ReturnType<typeof useDB>): string | null {
  const dose = nextUpcomingDose(m, db.doses, new Date());
  if (!dose) return null;
  const date = dose.scheduledAt.slice(0, 10);
  const time = dose.scheduledAt.slice(11, 16);
  const t = new Date(2000, 0, 1, Number(time.slice(0, 2)), Number(time.slice(3, 5)));
  const timeLabel = t.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (date === todayStr()) return `Today · ${timeLabel}`;
  return `${relativeDayLabel(date)} · ${timeLabel}`;
}

export default function MedicinesPage() {
  const db = useDB();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toDelete, setToDelete] = useState<Medicine | null>(null);

  const medicines = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = db.medicines.filter((m) => {
      if (q) {
        const hay = `${m.name} ${m.dosage} ${m.unit}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const completed = isMedicineCompleted(m, db.doses);
      const paused = m.paused;
      if (filter === "active") return !paused && !completed;
      if (filter === "paused") return paused;
      if (filter === "completed") return completed;
      return true;
    });

    const rank = (m: Medicine) => {
      if (m.paused) return 2;
      if (isMedicineCompleted(m, db.doses)) return 3;
      const dose = nextUpcomingDose(m, db.doses, new Date());
      return dose ? 0 : 1;
    };
    return list.sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      const na = nextUpcomingDose(a, db.doses, new Date());
      const nb = nextUpcomingDose(b, db.doses, new Date());
      if (na && nb) return na.scheduledAt.localeCompare(nb.scheduledAt);
      return a.name.localeCompare(b.name);
    });
  }, [db, query, filter]);

  const confirmDelete = (m: Medicine) => {
    actionDeleteMedicine(m.id);
    setToDelete(null);
    toast.success("Medicine deleted");
  };

  const togglePause = (m: Medicine) => {
    actionSetPaused(m.id, !m.paused);
    toast.success(m.paused ? "Reminders paused" : "Reminders resumed");
  };

  const counts = useMemo(() => {
    const completed = db.medicines.filter((m) => isMedicineCompleted(m, db.doses)).length;
    const paused = db.medicines.filter((m) => m.paused).length;
    const active = db.medicines.filter(
      (m) => !m.paused && !isMedicineCompleted(m, db.doses),
    ).length;
    return { all: db.medicines.length, active, paused, completed };
  }, [db]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Medicines</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {db.medicines.length > 0
              ? `${db.medicines.length} medicine${db.medicines.length === 1 ? "" : "s"}`
              : "Nothing here yet"}
          </p>
        </div>
        <Button
          className="hidden gap-1.5 md:inline-flex"
          onClick={() => navigate("/app/medicines/new")}
        >
          <Plus /> Add
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or dosage…"
          className="h-11 rounded-xl pl-10"
          aria-label="Search medicines"
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="h-10 w-full justify-start rounded-xl bg-transparent p-0">
          {(["all", "active", "paused", "completed"] as Filter[]).map((f) => (
            <TabsTrigger
              key={f}
              value={f}
              className="flex-1 rounded-lg text-sm capitalize data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-none"
            >
              {f}
              <span className="ml-1 text-xs text-muted-foreground">
                {counts[f]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {medicines.length === 0 ? (
        <Empty className="border border-border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Pill />
            </EmptyMedia>
            <EmptyTitle>
              {query || filter !== "all" ? "No medicines found" : "No medicines added yet"}
            </EmptyTitle>
            <EmptyDescription>
              {query || filter !== "all"
                ? "Try a different search or filter."
                : "Add your first medicine to start receiving reminders."}
            </EmptyDescription>
          </EmptyHeader>
          {!query && filter === "all" && (
            <EmptyContent>
              <Button
                className="h-12 px-6 text-base"
                onClick={() => navigate("/app/medicines/new")}
              >
                <Plus /> Add Medicine
              </Button>
              <button
                type="button"
                onClick={() => {
                  actionAddSampleData();
                }}
                className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Add sample data (for demonstration)
              </button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ul className="space-y-2.5">
          {medicines.map((m) => {
            const completed = isMedicineCompleted(m, db.doses);
            const next = nextLabel(m, db);
            return (
              <li
                key={m.id}
                className={cn(
                  "group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/40",
                  m.paused || completed ? "border-border/60" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/app/medicines/${m.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                  aria-label={`View ${m.name}`}
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Pill className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{m.name}</p>
                      {m.paused && (
                        <Badge variant="secondary" className="shrink-0">
                          Paused
                        </Badge>
                      )}
                      {completed && (
                        <Badge variant="secondary" className="shrink-0">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {dosageText(m)} · {frequencyLabel(m.frequency)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      {next ? `Next: ${next}` : "No upcoming reminder"}
                    </p>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      aria-label={`Actions for ${m.name}`}
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => navigate(`/app/medicines/${m.id}`)}>
                      <CheckCircle2 /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`/app/medicines/${m.id}/edit`)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => togglePause(m)}>
                      {m.paused ? <Play /> : <Pause />}
                      {m.paused ? "Resume" : "Pause"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setToDelete(m)}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      {db.medicines.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarX2 className="size-3.5" />
          Completed medicines no longer generate reminders.
        </p>
      )}

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this medicine?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also remove its future reminders. Historical dose records
              are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => toDelete && confirmDelete(toDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}