import { Get_Derived_Events, Get_Trace_Frame } from "@/lib/f1/derive";
import { formatGap, formatLapTime, formatSector } from "@/lib/f1/format";
import type { LeaderboardRow } from "@/lib/f1/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TracePanel({
  sessionKey,
  elapsed,
  board,
}: {
  sessionKey: number;
  elapsed: number;
  board: LeaderboardRow[];
}) {
  const frame = Get_Trace_Frame(sessionKey, elapsed, board);
  const recent = Get_Derived_Events(sessionKey, elapsed).slice(-6).reverse();
  const raw = frame.raw;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">
          Raw ingest → trigger → derived
        </p>
        <p className="mt-1 text-xs text-subtle">
          Left is what the sensor writes. Right is what the database computes.
        </p>
      </div>

      <section className="mx-3 mb-2 rounded-md bg-surface-2 px-3 py-2">
        <p className="mb-1.5 text-xs tracking-widest text-subtle uppercase">INSERT INTO laps</p>
        {raw ? (
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-fg">
{`driver_number: ${raw.driver_number}   #${raw.code}
lap_number:    ${raw.lap_number}
s1:            ${formatSector(raw.duration_sector_1)}
s2:            ${formatSector(raw.duration_sector_2)}
s3:            ${formatSector(raw.duration_sector_3)}
lap_duration:  ${formatLapTime(raw.lap_duration)}
ts:            ${raw.timestamp.slice(11, 23)}`}
          </pre>
        ) : (
          <p className="text-sm text-muted">Waiting for a completed lap…</p>
        )}
      </section>

      <section
        className={cn(
          "mx-3 mb-2 rounded-md px-3 py-2",
          frame.trigger.fired ? "bg-sector-purple/10" : "bg-surface-2",
        )}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <p className="text-xs tracking-widest text-subtle uppercase">AFTER INSERT trigger</p>
          {frame.trigger.fired && <Badge variant="purple">Fired</Badge>}
        </div>
        <pre className="font-mono text-xs leading-relaxed text-fg whitespace-pre-wrap">
          {frame.trigger.sql}
        </pre>
        {frame.trigger.fired && frame.trigger.kind && (
          <p className="mt-2 font-mono text-xs text-sector-purple">
            {frame.trigger.kind}:{" "}
            {frame.trigger.kind === "LAP"
              ? `${formatLapTime(frame.trigger.old_best)} → ${formatLapTime(frame.trigger.new_best)}`
              : `${formatSector(frame.trigger.old_best)} → ${formatSector(frame.trigger.new_best)}`}
          </p>
        )}
      </section>

      <section className="mx-3 mb-2 rounded-md bg-surface-2 px-3 py-2">
        <p className="mb-1.5 text-xs tracking-widest text-subtle uppercase">SELECT derived</p>
        <ul className="space-y-1 font-mono text-xs text-fg">
          <li>
            live_rank = {frame.derived.live_rank ?? "—"}
            <span className="ml-2 text-subtle">{frame.derived.formula_rank}</span>
          </li>
          <li>
            gap_to_leader = {formatGap(frame.derived.gap_to_leader)}
            <span className="ml-2 text-subtle">{frame.derived.formula_gap}</span>
          </li>
          <li>
            gap_to_ahead = {formatGap(frame.derived.gap_to_car_ahead)}
          </li>
          <li>
            is_purple ={" "}
            {frame.derived.purple.length ? frame.derived.purple.join(" ") : "0"}
          </li>
        </ul>
      </section>

      <div className="min-h-0 flex-1">
        <p className="px-3 pt-2 pb-1 text-xs tracking-widest text-subtle uppercase">
          Trigger log
        </p>
        {recent.length === 0 ? (
          <p className="px-3 text-sm text-muted">No session-best yet.</p>
        ) : (
          <ol>
            {recent.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 border-t border-border px-3 py-1.5"
              >
                <span className="w-8 font-mono text-xs text-sector-purple">{e.kind}</span>
                <span className="w-10 font-mono text-xs text-muted">L{e.lap_number}</span>
                <span className="flex-1 truncate text-sm font-bold tracking-wide uppercase">
                  {e.code}
                </span>
                <span className="font-mono text-xs tabular text-fg">
                  {e.kind === "LAP" ? formatLapTime(e.value) : formatSector(e.value)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
