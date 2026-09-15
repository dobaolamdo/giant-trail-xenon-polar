import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { DriverListRow, LapHistoryRow, LeaderboardRow } from "@/lib/f1/types";
import { formatLapTime, formatSector, splitName } from "@/lib/f1/format";
import { cn, onTeam, teamHex } from "@/lib/utils";
import { TyreCompound } from "./tyre";

export function DriverDetail({
  driver,
  row,
  laps,
}: {
  driver: DriverListRow | undefined;
  row: LeaderboardRow | undefined;
  laps: LapHistoryRow[];
}) {
  if (!driver || !row) {
    return <p className="p-4 text-sm text-muted">Select a driver from the tower.</p>;
  }
  const { first, last } = splitName(driver.full_name);
  const lastLap = laps[laps.length - 1];
  const team = teamHex(driver.team_colour);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex items-center gap-3 border-l-4 px-3 py-3"
        style={{ borderLeftColor: team }}
      >
        <span
          className="flex size-11 items-center justify-center rounded-md font-mono text-lg font-semibold tabular"
          style={{ backgroundColor: team, color: onTeam(driver.team_colour) }}
        >
          {driver.driver_number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wider text-muted uppercase">{first}</p>
          <h3 className="truncate text-xl font-extrabold tracking-wide text-fg uppercase">
            {last}
          </h3>
          <p className="text-xs text-subtle">{driver.team_name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs tracking-widest text-muted uppercase">P{row.live_rank}</p>
          <div className="mt-1 flex items-center justify-end gap-2">
            <TyreCompound compound={row.compound} size="md" />
          </div>
        </div>
      </div>

      {lastLap ? (
        <div className="grid grid-cols-4 gap-1 px-3 pb-2">
          <SectorBox label="Lap" value={formatLapTime(lastLap.lap_duration)} purple={lastLap.is_personal_best} />
          <SectorBox label="S1" value={formatSector(lastLap.duration_sector_1)} purple={lastLap.is_purple_s1} />
          <SectorBox label="S2" value={formatSector(lastLap.duration_sector_2)} purple={lastLap.is_purple_s2} />
          <SectorBox label="S3" value={formatSector(lastLap.duration_sector_3)} purple={lastLap.is_purple_s3} />
        </div>
      ) : row.points != null ? (
        <div className="px-3 pb-3">
          <p className="text-sm text-muted">
            Archive result — no lap telemetry.{" "}
            <span className="font-mono text-fg">{row.points} pts</span>
            {row.status === "DNF" ? " · DNF" : ""}
          </p>
        </div>
      ) : (
        <p className="px-3 pb-2 text-sm text-muted">Waiting for first lap.</p>
      )}

      <LapSpark laps={laps} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-xs tracking-widest text-subtle uppercase">
              <th className="px-3 py-1 font-medium">Lap</th>
              <th className="px-1 py-1 font-medium">Time</th>
              <th className="px-1 py-1 font-medium">S1</th>
              <th className="px-1 py-1 font-medium">S2</th>
              <th className="px-1 py-1 font-medium">S3</th>
              <th className="px-2 py-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {[...laps].reverse().map((l) => (
              <tr key={l.lap_number} className="border-t border-border">
                <td className="px-3 py-1 font-mono text-xs tabular text-muted">{l.lap_number}</td>
                <td
                  className={cn(
                    "px-1 py-1 font-mono text-xs tabular",
                    l.is_personal_best ? "text-sector-purple" : "text-fg",
                  )}
                >
                  {formatLapTime(l.lap_duration)}
                </td>
                <SectorCell value={l.duration_sector_1} purple={l.is_purple_s1} />
                <SectorCell value={l.duration_sector_2} purple={l.is_purple_s2} />
                <SectorCell value={l.duration_sector_3} purple={l.is_purple_s3} />
                <td className="px-2 py-1">
                  <TyreCompound compound={l.compound} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectorBox({
  label,
  value,
  purple,
}: {
  label: string;
  value: string;
  purple?: boolean;
}) {
  return (
    <div className={cn("rounded-md bg-surface-2 px-2 py-1.5", purple && "best-pulse")}>
      <p className="text-xs tracking-widest text-subtle uppercase">{label}</p>
      <p className={cn("font-mono text-sm tabular", purple ? "text-sector-purple" : "text-fg")}>
        {value}
      </p>
    </div>
  );
}

function SectorCell({ value, purple }: { value: number; purple: boolean }) {
  return (
    <td className={cn("px-1 py-1 font-mono text-xs tabular", purple ? "text-sector-purple" : "text-muted")}>
      {formatSector(value)}
    </td>
  );
}

function LapSpark({ laps }: { laps: LapHistoryRow[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const points = laps
    .filter((l) => !l.is_pit_out_lap && l.lap_duration < 130)
    .map((l) => ({ lap: l.lap_number, t: l.lap_duration }));
  if (!mounted || points.length < 3) return null;
  return (
    <div className="h-20 px-2 pb-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
          <XAxis dataKey="lap" hide />
          <YAxis domain={["dataMin - 0.5", "dataMax + 0.5"]} hide />
          <Line
            type="monotone"
            dataKey="t"
            stroke="var(--color-accent)"
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
