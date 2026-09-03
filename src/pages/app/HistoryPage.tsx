import { BarChart3, CalendarRange, History } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { DoseStatusBadge, statusMeta } from "@/components/status";
import {
  type Dose,
  addDaysStr,
  formatDateLong,
  formatTime12,
  parseLocalDate,
  todayStr,
  WEEKDAYS,
} from "@/lib/medicines";
import { useDB } from "@/lib/store";
import { cn } from "@/lib/utils";

type Filter = "today" | "yesterday" | "7d" | "30d" | "custom";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

function rangeFor(
  filter: Filter,
  customFrom: string,
  customTo: string,
): [string, string] {
  const today = todayStr();
  switch (filter) {
    case "today":
      return [today, today];
    case "yesterday":
      return [addDaysStr(today, -1), addDaysStr(today, -1)];
    case "7d":
      return [addDaysStr(today, -6), today];
    case "30d":
      return [addDaysStr(today, -29), today];
    case "custom":
      return [customFrom || today, customTo || today];
  }
}

export default function HistoryPage() {
  const db = useDB();
  const today = todayStr();
  const [filter, setFilter] = useState<Filter>("7d");
  const [customFrom, setCustomFrom] = useState(addDaysStr(today, -6));
  const [customTo, setCustomTo] = useState(today);

  const [from, to] = rangeFor(filter, customFrom, customTo);

  const records = useMemo(() => {
    return db.doses
      .filter((d) => {
        const date = d.scheduledAt.slice(0, 10);
        return date >= from && date <= to;
      })
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  }, [db, from, to]);

  const stats = useMemo(() => {
    const counted = records.filter((d) => d.status !== "upcoming");
    const taken = counted.filter((d) => d.status === "taken").length;
    const skipped = counted.filter((d) => d.status === "skipped").length;
    const missed = counted.filter((d) => d.status === "missed").length;
    const total = taken + skipped + missed;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { taken, skipped, missed, total, adherence };
  }, [records]);

  const week = useMemo(() => {
    const days: { date: string; label: string; taken: number; skipped: number; missed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = addDaysStr(today, -i);
      const counts = { taken: 0, skipped: 0, missed: 0 };
      for (const d of db.doses) {
        if (d.scheduledAt.slice(0, 10) !== date) continue;
        if (d.status === "taken") counts.taken += 1;
        else if (d.status === "skipped") counts.skipped += 1;
        else if (d.status === "missed") counts.missed += 1;
      }
      days.push({
        date,
        label: WEEKDAYS[parseLocalDate(date).getDay()],
        ...counts,
      });
    }
    return days;
  }, [db, today]);

  const maxDay = Math.max(1, ...week.map((d) => d.taken + d.skipped + d.missed));
  const weekTotal = week.reduce((s, d) => s + d.taken + d.skipped + d.missed, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, Dose[]>();
    for (const d of records) {
      const date = d.scheduledAt.slice(0, 10);
      const list = map.get(date);
      if (list) list.push(d);
      else map.set(date, [d]);
    }
    return [...map.entries()];
  }, [records]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every recorded dose, in one place.
        </p>
      </header>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                filter === f.value
                  ? "border-transparent bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filter === "custom" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label htmlFor="hist-from" className="text-sm text-muted-foreground">
                From
              </label>
              <Input
                id="hist-from"
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="hist-to" className="text-sm text-muted-foreground">
                To
              </label>
              <Input
                id="hist-to"
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border shadow-none">
          <CardContent className="p-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Medication adherence
            </p>
            <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">
              {stats.adherence}
              <span className="text-2xl text-muted-foreground">%</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.total > 0
                ? `Doses taken out of ${stats.total} recorded in this period`
                : "No doses recorded in this period."}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/60 px-2 py-2.5">
                <p className="text-lg font-semibold tabular-nums">{stats.taken}</p>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Taken
                </p>
              </div>
              <div className="rounded-xl bg-muted/60 px-2 py-2.5">
                <p className="text-lg font-semibold tabular-nums">{stats.skipped}</p>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Skipped
                </p>
              </div>
              <div className="rounded-xl bg-muted/60 px-2 py-2.5">
                <p className="text-lg font-semibold tabular-nums">{stats.missed}</p>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Missed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardContent className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="size-4" /> Last 7 days
            </p>
            {weekTotal === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                No recorded activity in the last 7 days.
              </p>
            ) : (
              <>
                <div className="mt-4 flex h-32 items-end gap-2">
                  {week.map((d) => {
                    const dayTotal = d.taken + d.skipped + d.missed;
                    const hTaken = (d.taken / maxDay) * 100;
                    const hSkipped = (d.skipped / maxDay) * 100;
                    const hMissed = (d.missed / maxDay) * 100;
                    const isToday = d.date === today;
                    return (
                      <div
                        key={d.date}
                        className="flex flex-1 flex-col items-center gap-1.5"
                        title={`${d.date}: ${d.taken} taken, ${d.skipped} skipped, ${d.missed} missed`}
                      >
                        <div className="flex w-full flex-1 flex-col-reverse justify-start">
                          {dayTotal > 0 ? (
                            <div className="flex w-full flex-col justify-end overflow-hidden rounded-md bg-muted/40">
                              {hTaken > 0 && (
                                <div
                                  className="w-full bg-foreground"
                                  style={{ height: `${hTaken}%` }}
                                />
                              )}
                              {hSkipped > 0 && (
                                <div
                                  className="w-full bg-amber-400/70"
                                  style={{ height: `${hSkipped}%` }}
                                />
                              )}
                              {hMissed > 0 && (
                                <div
                                  className="w-full bg-red-400/70"
                                  style={{ height: `${hMissed}%` }}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="h-1 w-full rounded-full bg-muted/50" />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            isToday ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-foreground" /> Taken
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-400/80" /> Skipped
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-red-400/80" /> Missed
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Records */}
      <section>
        {records.length === 0 ? (
          <Empty className="border border-border py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <History />
              </EmptyMedia>
              <EmptyTitle>No medication history yet</EmptyTitle>
              <EmptyDescription>
                Doses you mark as taken, skipped, or missed will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, doses]) => (
              <div key={date}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-semibold">{formatDateLong(date)}</p>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {doses.length} dose{doses.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="space-y-2">
                  {doses.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-3.5"
                    >
                      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted/60 py-1.5">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatTime12(d.scheduledAt.slice(11, 16))}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {d.medicineName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.dosageText}
                          {d.actionAt && (
                            <>
                              {" · "}
                              {statusMeta(d.status).label.toLowerCase()} at{" "}
                              {new Date(d.actionAt).toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                        </p>
                      </div>
                      <DoseStatusBadge status={d.status} className="shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {records.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground">
          <CalendarRange className="size-3.5" />
          {formatDateLong(from)}
          {to !== from && <> – {formatDateLong(to)}</>}
        </p>
      )}
    </div>
  );
}