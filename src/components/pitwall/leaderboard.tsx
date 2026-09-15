import { ChevronDown, ChevronUp, Minus } from "lucide-react";
import type { LeaderboardRow } from "@/lib/f1/types";
import { formatGap, formatInterval, formatLapTime, splitName } from "@/lib/f1/format";
import { cn, onTeam, teamHex } from "@/lib/utils";
import { TyreCompound } from "./tyre";

export function Leaderboard({
  rows,
  selected,
  onSelect,
  mode = "live",
}: {
  rows: LeaderboardRow[];
  selected: number;
  onSelect: (n: number) => void;
  mode?: "live" | "result";
}) {
  const result = mode === "result";
  return (
    <section className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
          {result ? "Race classification" : "Live leaderboard"}
        </h2>
        <span className="text-xs tracking-wider text-subtle uppercase">
          {result ? "Official result" : "Tap a car"}
        </span>
      </div>
      <div
        className="col-head hidden px-2 pb-1 tracking-widest text-subtle uppercase md:flex md:items-center md:gap-2"
        aria-hidden
      >
        <span className="w-7 shrink-0 text-right">P</span>
        <span className="w-4 shrink-0" />
        <span className="w-9 shrink-0">No</span>
        <span className="min-w-0 flex-1">Driver</span>
        <span className="w-20 shrink-0 text-right">Gap</span>
        {!result && <span className="w-16 shrink-0 text-right">Int</span>}
        {!result && <span className="w-20 shrink-0 text-right">Last</span>}
        {result && <span className="w-12 shrink-0 text-right">Pts</span>}
        {!result && <span className="w-6 shrink-0" />}
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1">
        {rows.map((row) => (
          <li key={row.driver_number}>
            <DriverRow
              row={row}
              selected={selected === row.driver_number}
              onSelect={() => onSelect(row.driver_number)}
              result={result}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function DriverRow({
  row,
  selected,
  onSelect,
  result,
}: {
  row: LeaderboardRow;
  selected: boolean;
  onSelect: () => void;
  result: boolean;
}) {
  const { first, last } = splitName(row.full_name);
  const team = teamHex(row.team_colour);
  const pit = row.status === "PIT";
  const dnf = row.status === "DNF";
  const sc = row.status === "SC";

  let gapLabel: string;
  if (dnf) gapLabel = "DNF";
  else if (pit) gapLabel = "PIT";
  else if (row.live_rank === 1) gapLabel = "Leader";
  else if (sc) gapLabel = formatGap(row.gap_to_leader);
  else gapLabel = formatGap(row.gap_to_leader);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 px-2 py-1.5 text-left transition-colors duration-150 md:min-h-10",
        "hover:bg-surface-2",
        selected ? "bg-surface-2" : "bg-transparent",
        dnf && "opacity-50",
      )}
    >
      <span
        className={cn(
          "w-7 shrink-0 text-right font-mono text-sm font-semibold tabular",
          row.live_rank === 1 ? "text-accent" : "text-muted",
        )}
      >
        {row.live_rank}
      </span>
      {!result && <PosDelta delta={row.position_change ?? 0} />}
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-semibold tabular"
        style={{ backgroundColor: team, color: onTeam(row.team_colour) }}
      >
        {row.driver_number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="hidden truncate text-xs text-muted sm:inline">{first}</span>
          <span className="truncate text-base font-bold tracking-wide text-fg uppercase">
            {last}
          </span>
        </span>
        <span className="hidden truncate text-xs text-subtle md:block">{row.team_name}</span>
      </span>
      <span
        className={cn(
          "w-20 shrink-0 text-right font-mono text-sm tabular",
          dnf ? "text-muted" : pit ? "text-accent" : sc && row.live_rank !== 1 ? "text-flag-yellow" : "text-fg",
        )}
      >
        {gapLabel}
      </span>
      {!result && (
        <span className="hidden w-16 shrink-0 text-right font-mono text-xs tabular text-muted md:block">
          {dnf || pit || row.live_rank === 1 ? "—" : formatInterval(row.gap_to_car_ahead)}
        </span>
      )}
      {result ? (
        <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold tabular">
          {row.points ?? 0}
        </span>
      ) : (
        <>
          <span className="hidden w-20 shrink-0 text-right font-mono text-xs tabular text-muted lg:block">
            {formatLapTime(row.last_lap)}
          </span>
          <span className="w-6 shrink-0">
            <TyreCompound compound={row.compound} />
          </span>
        </>
      )}
    </button>
  );
}

function PosDelta({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="flex w-4 shrink-0 justify-center text-sector-green" title={`Up ${delta}`}>
        <ChevronUp className="size-3.5" />
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex w-4 shrink-0 justify-center text-accent" title={`Down ${Math.abs(delta)}`}>
        <ChevronDown className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="flex w-4 shrink-0 justify-center text-subtle">
      <Minus className="size-3" />
    </span>
  );
}
