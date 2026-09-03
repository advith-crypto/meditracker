import { ArrowLeft, CalendarDays, Clock3, Pill, Plus, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type Frequency,
  type Meal,
  type Medicine,
  type Unit,
  FREQUENCIES,
  MEALS,
  UNITS,
  WEEKDAYS,
  todayStr,
} from "@/lib/medicines";
import {
  actionAddMedicine,
  actionUpdateMedicine,
  useDB,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}

export default function MedicineFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const db = useDB();
  const editing = useMemo(
    () => (id ? db.medicines.find((m) => m.id === id) : undefined),
    [id, db],
  );

  const [name, setName] = useState(editing?.name ?? "");
  const [dosage, setDosage] = useState(editing?.dosage ?? "");
  const [unit, setUnit] = useState<Unit>(editing?.unit ?? "tablet");
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency ?? "daily");
  const [times, setTimes] = useState<string[]>(
    editing?.times.length ? editing.times : [""],
  );
  const [days, setDays] = useState<number[]>(editing?.days ?? []);
  const [startDate, setStartDate] = useState(editing?.startDate ?? todayStr());
  const [endDate, setEndDate] = useState<string | null>(editing?.endDate ?? null);
  const [meal, setMeal] = useState<Meal>(editing?.mealInstruction ?? "none");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(
    editing?.reminderEnabled ?? true,
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const changeFrequency = (f: Frequency) => {
    setFrequency(f);
    const count = FREQUENCIES.find((x) => x.value === f)?.times ?? 1;
    setTimes((prev) => {
      if (prev.length > count) return prev.slice(0, count);
      const next = [...prev];
      while (next.length < count) next.push("");
      return next;
    });
  };

  const setTimeAt = (i: number, value: string) => {
    setTimes((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  };

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    const cleanTimes = times.map((t) => t.trim()).filter((t) => t.length > 0);
    if (!name.trim()) errs.name = "Medicine name is required.";
    if (!dosage.trim()) {
      errs.dosage = "Dosage is required — enter a value like 500 mg or 1.";
    }
    if (cleanTimes.length === 0) {
      errs.times = "At least one reminder time is required.";
    } else if (cleanTimes.some((t) => !TIME_RE.test(t))) {
      errs.times = "One of the reminder times is not valid.";
    }
    if (frequency === "custom" && days.length === 0) {
      errs.days = "Select at least one day of the week.";
    }
    if (startDate && endDate && endDate < startDate) {
      errs.dates = "Start date cannot be after end date.";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = document.querySelector("[data-invalid='true']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const input = {
      name: name.trim(),
      dosage: dosage.trim(),
      unit,
      frequency,
      times: cleanTimes,
      days,
      startDate: startDate || todayStr(),
      endDate: endDate || null,
      mealInstruction: meal,
      notes: notes.trim(),
      reminderEnabled,
    };

    if (editing) {
      actionUpdateMedicine(editing.id, input);
      toast.success("Medicine updated successfully");
      navigate("/app/medicines", { replace: true });
    } else {
      actionAddMedicine(input);
      toast.success("Medicine added successfully");
      navigate("/app", { replace: true });
    }
  };

  const presetCount = FREQUENCIES.find((f) => f.value === frequency)?.times ?? 1;
  const showDays = frequency === "custom";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {editing ? "Edit Medicine" : "Add Medicine"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editing
              ? "Update the details and schedule."
              : "Add a medicine and its reminder schedule."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Details */}
        <Card className="border-border shadow-none">
          <CardContent className="space-y-5 p-5">
            <div data-invalid={!!errors.name}>
              <Label htmlFor="med-name" className="mb-1.5 block">
                Medicine name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="med-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Paracetamol"
                className="h-11 rounded-xl"
                autoFocus
              />
              <FieldError message={errors.name} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div data-invalid={!!errors.dosage}>
                <Label htmlFor="med-dosage" className="mb-1.5 block">
                  Dosage <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="med-dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 500 mg or 1"
                  inputMode="text"
                  className="h-11 rounded-xl"
                />
                <FieldError message={errors.dosage} />
              </div>
              <div>
                <Label htmlFor="med-unit" className="mb-1.5 block">
                  Unit
                </Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                  <SelectTrigger id="med-unit" className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Frequency</Label>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={frequency === f.value}
                    onClick={() => changeFrequency(f.value)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      frequency === f.value
                        ? "border-transparent bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reminder times */}
            <div data-invalid={!!errors.times}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Clock3 className="size-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Reminder times <span className="text-destructive">*</span>
                </Label>
              </div>
              <div className="space-y-2">
                {times.slice(0, 8).map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={t}
                      onChange={(e) => setTimeAt(i, e.target.value)}
                      aria-label={`Reminder time ${i + 1}`}
                      className="h-11 rounded-xl"
                    />
                    {times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTimes((prev) => prev.filter((_, idx) => idx !== i))}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label={`Remove time ${i + 1}`}
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <FieldError message={errors.times} />
                {times.length < 8 && (
                  <button
                    type="button"
                    onClick={() => setTimes((prev) => [...prev, ""])}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="size-4" /> Add another time
                  </button>
                )}
              </div>
              {presetCount > 1 && frequency !== "custom" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {presetCount} reminder times set for {FREQUENCIES.find((f) => f.value === frequency)?.label.toLowerCase()} — adjust them above as needed.
                </p>
              )}
            </div>

            {/* Custom days */}
            {showDays && (
              <div data-invalid={!!errors.days}>
                <Label className="mb-1.5 block">Days of the week</Label>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={days.includes(i)}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors",
                        days.includes(i)
                          ? "border-transparent bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.days} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Reminder times above apply to every selected day.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Duration */}
        <Card className="border-border shadow-none">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Duration</Label>
            </div>
            <div className="grid grid-cols-2 gap-3" data-invalid={!!errors.dates}>
              <div>
                <Label htmlFor="med-start" className="mb-1.5 block">
                  Start date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="med-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="med-end" className="mb-1.5 block">
                  End date <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="med-end"
                  type="date"
                  value={endDate ?? ""}
                  onChange={(e) => setEndDate(e.target.value || null)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <FieldError message={errors.dates} />
          </CardContent>
        </Card>

        {/* Meal + notes */}
        <Card className="border-border shadow-none">
          <CardContent className="space-y-5 p-5">
            <div>
              <Label className="mb-1.5 block">Meal instruction</Label>
              <div className="flex flex-wrap gap-2">
                {MEALS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={meal === m.value}
                    onClick={() => setMeal(m.value)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      meal === m.value
                        ? "border-transparent bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Choose this yourself — MediReminder never decides meal timing.
              </p>
            </div>

            <div>
              <Label htmlFor="med-notes" className="mb-1.5 block">
                Notes{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="med-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything you want to remember about this medicine…"
                rows={3}
                className="rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
              <div>
                <Label htmlFor="med-reminder" className="font-medium">
                  Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show alerts when it’s time to take this medicine.
                </p>
              </div>
              <Switch
                id="med-reminder"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
                aria-label="Reminders for this medicine"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-4">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 text-base"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-12 flex-1 gap-2 text-base">
            <Pill className="size-4" />
            {editing ? "Save Changes" : "Save Medicine"}
          </Button>
        </div>
      </form>
    </div>
  );
}