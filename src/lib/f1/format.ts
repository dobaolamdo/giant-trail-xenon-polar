export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: "", last: parts[0] ?? full };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] ?? full };
}

export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const rem = seconds - m * 60;
  const [ints, frac] = rem.toFixed(3).split(".");
  return `${m}:${(ints ?? "0").padStart(2, "0")}.${frac ?? "000"}`;
}

export function formatGap(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  if (seconds >= 1000) return "+1 LAP";
  if (seconds < 0) seconds = 0;
  if (seconds >= 60) return `+${formatLapTime(seconds)}`;
  return `+${seconds.toFixed(3)}`;
}

export function formatInterval(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  if (seconds < 0) seconds = 0;
  if (seconds >= 60) return `+${formatLapTime(seconds)}`;
  return `+${seconds.toFixed(3)}`;
}

export function formatSector(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "—";
  return seconds.toFixed(3);
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
