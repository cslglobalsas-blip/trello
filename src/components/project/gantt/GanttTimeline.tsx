import { useMemo } from "react";
import { format, addDays, startOfWeek, startOfMonth, addWeeks, addMonths, isSameMonth, isSameWeek } from "date-fns";
import { es } from "date-fns/locale";

export type ViewMode = "day" | "week" | "month";

const CELL_WIDTHS: Record<ViewMode, number> = { day: 40, week: 80, month: 120 };

interface Props {
  start: Date;
  end: Date;
  mode: ViewMode;
}

export function getCellWidth(mode: ViewMode) {
  return CELL_WIDTHS[mode];
}

export function GanttTimeline({ start, end, mode }: Props) {
  const cells = useMemo(() => {
    const result: { label: string; subLabel?: string; width: number }[] = [];
    const cw = CELL_WIDTHS[mode];

    if (mode === "day") {
      let d = new Date(start);
      while (d <= end) {
        result.push({ label: format(d, "d"), subLabel: format(d, "EEE", { locale: es }), width: cw });
        d = addDays(d, 1);
      }
    } else if (mode === "week") {
      let d = startOfWeek(start, { weekStartsOn: 1 });
      while (d <= end) {
        const wEnd = addDays(d, 6);
        result.push({ label: `${format(d, "d MMM", { locale: es })}`, width: cw });
        d = addWeeks(d, 1);
      }
    } else {
      let d = startOfMonth(start);
      while (d <= end) {
        result.push({ label: format(d, "MMM yyyy", { locale: es }), width: cw });
        d = addMonths(d, 1);
      }
    }
    return result;
  }, [start, end, mode]);

  const totalWidth = cells.reduce((s, c) => s + c.width, 0);

  return (
    <div className="flex border-b border-border bg-muted/50" style={{ width: totalWidth, minWidth: totalWidth }}>
      {cells.map((c, i) => (
        <div
          key={i}
          className="flex-shrink-0 border-r border-border text-center text-[10px] text-muted-foreground py-1 select-none"
          style={{ width: c.width }}
        >
          <div className="font-medium">{c.label}</div>
          {c.subLabel && <div className="text-[9px]">{c.subLabel}</div>}
        </div>
      ))}
    </div>
  );
}

export function getTotalDays(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
