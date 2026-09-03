import {
  ArrowLeft,
  Bell,
  BellOff,
  CalendarDays,
  Clock3,
  Pause,
  Pencil,
  Pill,
  Play,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type Medicine,
  WEEKDAYS,
  dosageText,
  formatDateMedium,
  formatTime12,
  frequencyLabel,
  mealLabel,
} from "@/lib/medicines";
import { actionDeleteMedicine, actionSetPaused, useDB } from "@/lib/store";
import { useState, type ReactNode } from "react";

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <dt className="w-32 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function MedicineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const db = useDB();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const medicine: Medicine | undefined = db.medicines.find((m) => m.id === id);

  if (!medicine) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate("/app/medicines")}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Card className="border-border py-12 text-center shadow-none">
          <p className="font-medium">Medicine not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted.
          </p>
          <Button className="mt-4" onClick={() => navigate("/app/medicines")}>
            Back to Medicines
          </Button>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    actionDeleteMedicine(medicine.id);
    setConfirmOpen(false);
    toast.success("Medicine deleted");
    navigate("/app/medicines", { replace: true });
  };

  const togglePause = () => {
    actionSetPaused(medicine.id, !medicine.paused);
    toast.success(medicine.paused ? "Reminders resumed" : "Reminders paused");
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/medicines")}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">Medicine details</h1>
      </header>

      {/* Summary card */}
      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Pill className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  {medicine.name}
                </h2>
                {medicine.paused && (
                  <Badge variant="secondary">Paused</Badge>
                )}
              </div>
              <p className="mt-0.5 text-muted-foreground">
                {dosageText(medicine)}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{frequencyLabel(medicine.frequency)}</Badge>
                {medicine.reminderEnabled ? (
                  <Badge variant="secondary" className="gap-1">
                    <Bell className="size-3" /> Reminders on
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <BellOff className="size-3" /> Reminders off
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card className="border-border shadow-none">
        <CardContent className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock3 className="size-4" /> Schedule
          </h3>
          <dl className="mt-2 divide-y divide-border">
            <Row label="Frequency">
              {frequencyLabel(medicine.frequency)}
            </Row>
            <Row label="Reminder times">
              <span className="flex flex-col items-end gap-1">
                {medicine.times.map((t) => (
                  <span key={t} className="tabular-nums">
                    {formatTime12(t)}
                  </span>
                ))}
              </span>
            </Row>
            {medicine.frequency === "custom" && (
              <Row label="Days">
                <span className="flex flex-wrap justify-end gap-1">
                  {medicine.days.map((d) => (
                    <span
                      key={d}
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-border px-1.5 text-xs"
                    >
                      {WEEKDAYS[d]}
                    </span>
                  ))}
                </span>
              </Row>
            )}
            <Row label="Start date">{formatDateMedium(medicine.startDate)}</Row>
            <Row label="End date">
              {medicine.endDate ? formatDateMedium(medicine.endDate) : "No end date"}
            </Row>
            <Row label="Meal">
              {mealLabel(medicine.mealInstruction)}
            </Row>
          </dl>
        </CardContent>
      </Card>

      {medicine.notes && (
        <Card className="border-border shadow-none">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {medicine.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-none">
        <CardContent className="flex flex-col items-start gap-2 p-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            Added {formatDateMedium(medicine.startDate)}
            {medicine.endDate ? ` · ends ${formatDateMedium(medicine.endDate)}` : ""}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2.5 pb-4">
        <Button
          className="h-12 gap-2 text-base"
          onClick={() => navigate(`/app/medicines/${medicine.id}/edit`)}
        >
          <Pencil className="size-4" /> Edit Medicine
        </Button>
        <Button
          variant="outline"
          className="h-12 gap-2 text-base"
          onClick={togglePause}
        >
          {medicine.paused ? (
            <>
              <Play className="size-4" /> Resume Reminders
            </>
          ) : (
            <>
              <Pause className="size-4" /> Pause Reminders
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="h-12 gap-2 text-base text-destructive hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" /> Delete Medicine
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}