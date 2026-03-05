import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";

export interface CustomRecurrenceValues {
  recurrence_interval: number;
  recurrence_unit: string;
  recurrence_days: string[];
  recurrence_end_date: string | null;
  recurrence_ends_after: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: Partial<CustomRecurrenceValues>;
  onSave: (values: CustomRecurrenceValues) => void;
}

const DAY_MAP = [
  { value: "mon", label: "L" },
  { value: "tue", label: "M" },
  { value: "wed", label: "M" },
  { value: "thu", label: "J" },
  { value: "fri", label: "V" },
  { value: "sat", label: "S" },
  { value: "sun", label: "D" },
];

export function CustomRecurrenceDialog({ open, onOpenChange, initialValues, onSave }: Props) {
  const [interval, setInterval_] = useState(1);
  const [unit, setUnit] = useState("days");
  const [days, setDays] = useState<string[]>([]);
  const [endMode, setEndMode] = useState<"never" | "date" | "after">("never");
  const [endDate, setEndDate] = useState("");
  const [endsAfter, setEndsAfter] = useState(1);

  useEffect(() => {
    if (open) {
      setInterval_(initialValues.recurrence_interval || 1);
      setUnit(initialValues.recurrence_unit || "days");
      setDays(initialValues.recurrence_days || []);
      if (initialValues.recurrence_ends_after) {
        setEndMode("after");
        setEndsAfter(initialValues.recurrence_ends_after);
        setEndDate("");
      } else if (initialValues.recurrence_end_date) {
        setEndMode("date");
        setEndDate(initialValues.recurrence_end_date);
        setEndsAfter(1);
      } else {
        setEndMode("never");
        setEndDate("");
        setEndsAfter(1);
      }
    }
  }, [open]);

  function handleSave() {
    onSave({
      recurrence_interval: interval,
      recurrence_unit: unit,
      recurrence_days: unit === "weeks" ? days : [],
      recurrence_end_date: endMode === "date" ? endDate || null : null,
      recurrence_ends_after: endMode === "after" ? endsAfter : null,
    });
    onOpenChange(false);
  }

  function toggleDay(day: string) {
    setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogTitle>Recurrencia personalizada</DialogTitle>

        <div className="space-y-5 pt-2">
          {/* Interval row */}
          <div>
            <Label className="text-xs text-muted-foreground">Repetir cada</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                min={1}
                max={99}
                value={interval}
                onChange={(e) => setInterval_(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                className="h-8 text-xs w-20"
              />
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Días</SelectItem>
                  <SelectItem value="weeks">Semanas</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Days row (only for weeks) */}
          {unit === "weeks" && (
            <div>
              <Label className="text-xs text-muted-foreground">Los días</Label>
              <div className="flex gap-1 mt-1">
                {DAY_MAP.map((d) => (
                  <Toggle
                    key={d.value}
                    size="sm"
                    pressed={days.includes(d.value)}
                    onPressedChange={() => toggleDay(d.value)}
                    className="h-8 w-8 p-0 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {d.label}
                  </Toggle>
                ))}
              </div>
            </div>
          )}

          {/* End mode */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Termina</Label>
            <RadioGroup value={endMode} onValueChange={(v) => setEndMode(v as any)} className="space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="never" id="r-never" />
                <Label htmlFor="r-never" className="text-sm font-normal cursor-pointer">Nunca</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="date" id="r-date" />
                <Label htmlFor="r-date" className="text-sm font-normal cursor-pointer">En fecha</Label>
                {endMode === "date" && (
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs w-40 ml-2"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="after" id="r-after" />
                <Label htmlFor="r-after" className="text-sm font-normal cursor-pointer">Después de</Label>
                {endMode === "after" && (
                  <div className="flex items-center gap-1 ml-2">
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={endsAfter}
                      onChange={(e) => setEndsAfter(Math.max(1, Number(e.target.value) || 1))}
                      className="h-8 text-xs w-16"
                    />
                    <span className="text-xs text-muted-foreground">ocurrencias</span>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleSave} className="w-full">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const UNIT_LABELS: Record<string, { singular: string; plural: string }> = {
  days: { singular: "día", plural: "días" },
  weeks: { singular: "semana", plural: "semanas" },
  months: { singular: "mes", plural: "meses" },
};

const DAY_LABELS: Record<string, string> = {
  mon: "L", tue: "M", wed: "M", thu: "J", fri: "V", sat: "S", sun: "D",
};

export function getRecurrenceSummary(
  interval: number | null,
  unit: string | null,
  days: string[] | null
): string {
  const i = interval || 1;
  const u = unit || "days";

  if (i === 1 && u === "days") return "Diariamente";
  if (i === 1 && u === "weeks" && (!days || days.length === 0)) return "Semanalmente";
  if (i === 1 && u === "months") return "Mensualmente";

  const ul = UNIT_LABELS[u] || UNIT_LABELS.days;
  let text = `Cada ${i} ${i === 1 ? ul.singular : ul.plural}`;

  if (u === "weeks" && days && days.length > 0) {
    const sorted = [...days].sort((a, b) => {
      const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      return order.indexOf(a) - order.indexOf(b);
    });
    text += ` · ${sorted.map((d) => DAY_LABELS[d] || d).join(", ")}`;
  }

  return text;
}
