interface Props {
  left: number;
  height: number;
}

export function GanttTodayLine({ left, height }: Props) {
  return (
    <div
      className="absolute top-0 w-0.5 bg-[#0052CC] opacity-50 z-20 pointer-events-none"
      style={{ left, height }}
    />
  );
}
