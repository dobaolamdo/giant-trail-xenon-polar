import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { DriverListRow, LapHistoryRow, LeaderboardRow } from "@/lib/f1/types";
import { formatLapTime, formatSector, splitName } from "@/lib/f1/format";
import { cn, onTeam, teamHex } from "@/lib/utils";
import { TyreCompound } from "./tyre";
import { Zap, AlertTriangle, ShieldCheck, Gauge, BatteryCharging, BatteryWarning, Wind } from "lucide-react";

export function DriverDetail({
  driver,
  row,
  laps,
  is2026: propIs2026,
}: {
  driver: DriverListRow | undefined;
  row: LeaderboardRow | undefined;
  laps: LapHistoryRow[];
  is2026?: boolean;
}) {
  if (!driver || !row) {
    return <p className="p-4 text-sm text-muted">Select a driver from the tower.</p>;
  }
  const { first, last } = splitName(driver.full_name);
  const lastLap = laps[laps.length - 1];
  const team = teamHex(driver.team_colour);

  // Synchronized telemetry from row
  const speed = typeof row.speed === "number" ? row.speed : 0;
  const gear = row.gear !== undefined ? row.gear : (speed > 0 ? 3 : 1);
  const rpm = typeof row.rpm === "number" ? row.rpm : (speed > 0 ? 10500 : 11200);
  const throttle = typeof row.throttle === "number" ? row.throttle : (speed > 0 ? 80 : 0);
  const brake = typeof row.brake === "number" ? row.brake : 0;

  // Strict 2026 guard: only true if passed or if 2026 fields exist
  const is2026 = propIs2026 ?? (row.battery_soc !== undefined && row.aero_mode !== undefined);

  const isClipping = is2026 ? Boolean(row.is_clipping) : false;
  const isOvertake = is2026 ? Boolean(row.overtake_mode) : false;
  const batterySoc = typeof row.battery_soc === "number" ? row.battery_soc : 85;
  const deploymentKw = typeof row.deployment_kw === "number" ? row.deployment_kw : (isClipping ? 0 : 280);
  const aeroMode = row.aero_mode || (speed > 260 ? "X-MODE" : "Z-MODE");
  const isDrs = !is2026 && Boolean(row.drs);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* 1. DRIVER HEADER */}
      <div
        className="flex items-center gap-3 border-l-4 px-3 py-2.5 bg-surface/50"
        style={{ borderLeftColor: team }}
      >
        <span
          className="flex size-11 items-center justify-center rounded-md font-mono text-lg font-black tabular shadow"
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
          <p className="text-xs tracking-widest text-muted uppercase font-mono font-bold">P{row.live_rank}</p>
          <div className="mt-1 flex items-center justify-end gap-2">
            <TyreCompound compound={row.compound} size="md" />
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME UNIFIED TELEMETRY STRIP (Synchronized with Leaderboard & Track Map) */}
      <div className="m-2.5 rounded-lg border border-border/80 bg-surface-2/70 p-2 text-xs font-mono">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-[10px]">
          <span className="flex items-center gap-1 font-bold text-cyan-400">
            <Gauge className="size-3" /> VIỄN TRẮC REALTIME
          </span>
          <span className="text-muted">
            {speed === 0
              ? "STANDING ON GRID"
              : is2026
                ? `${aeroMode} · ${rpm} RPM`
                : `${isDrs ? "DRS ACTIVE" : "DRS CLOSED"} · ${rpm} RPM`}
          </span>
        </div>

        {/* Speed, Gear, Throttle, Brake Readouts */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 text-center">
          <div className="rounded bg-black/40 p-1 border border-white/5">
            <span className="text-[9px] text-muted block">SPEED</span>
            <span className="text-base font-black text-white">{speed}</span>
            <span className="text-[8px] text-subtle block">km/h</span>
          </div>

          <div className="rounded bg-black/40 p-1 border border-white/5">
            <span className="text-[9px] text-muted block">GEAR</span>
            <span className="text-base font-black text-cyan-400">{gear}</span>
            <span className="text-[8px] text-subtle block">shift</span>
          </div>

          <div className="rounded bg-black/40 p-1 border border-white/5">
            <span className="text-[9px] text-muted block">THROTTLE</span>
            <span className="text-base font-black text-emerald-400">{throttle}%</span>
            <div className="h-1 w-full bg-surface-3 rounded-full mt-0.5 overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${throttle}%` }} />
            </div>
          </div>

          <div className="rounded bg-black/40 p-1 border border-white/5">
            <span className="text-[9px] text-muted block">BRAKE</span>
            <span className="text-base font-black text-red-400">{brake}%</span>
            <div className="h-1 w-full bg-surface-3 rounded-full mt-0.5 overflow-hidden">
              <div className="h-full bg-red-400" style={{ width: `${brake}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. DEDICATED SUPER CLIPPING (2026 ONLY) vs V6 TURBO HYBRID TELEMETRY (PRE-2026) */}
      {is2026 ? (
        <div className="mx-2.5 mb-2.5 rounded-lg border border-cyan-500/30 bg-gradient-to-b from-cyan-950/25 to-surface p-2.5 font-mono text-xs">
          {/* Banner: Clipping Status */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px]">
              <Zap className="size-3.5 text-amber-400" />
              2026 MGU-K Telemetry (350kW)
            </span>

            {isClipping ? (
              <span className="rounded bg-red-600/30 px-2 py-0.5 text-[10px] font-black text-red-400 border border-red-500 animate-pulse flex items-center gap-1 shadow-sm shadow-red-950">
                <AlertTriangle className="size-3" />
                SUPER CLIPPING DETECTED
              </span>
            ) : isOvertake ? (
              <span className="rounded bg-cyan-500/25 px-2 py-0.5 text-[10px] font-black text-cyan-300 border border-cyan-400 animate-pulse">
                ⚡ MOM ACTIVE (+350kW)
              </span>
            ) : (
              <span className="rounded bg-surface-3 px-2 py-0.5 text-[10px] text-muted border border-border">
                MOM ARMED (Ready)
              </span>
            )}
          </div>

          {/* Super Clipping Detailed Alert Banner */}
          {isClipping ? (
            <div className="mb-2.5 rounded border border-red-500/40 bg-red-950/40 p-2 text-[10px] leading-relaxed text-red-200">
              <div className="font-bold text-red-400 flex items-center gap-1 mb-0.5">
                <AlertTriangle className="size-3.5 shrink-0" />
                HIỆN TƯỢNG SUPER CLIPPING (DE-RATE TỐC ĐỘ):
              </div>
              Xe đang chạy ở tốc độ cao ({speed} km/h) trên đoạn thẳng nhưng <b>dung lượng Pin cạn kiệt (&lt;16%)</b>. 
              MGU-K ngắt đột ngột từ 350kW về <b>0kW</b> khiến xe bị hụt gia tốc và đứng tốc độ trước điểm phanh!
            </div>
          ) : (
            <div className="mb-2 text-[10px] text-muted flex items-center justify-between">
              <span>Trạng thái: <b className="text-emerald-400">Công suất điện khả dụng (Nominal)</b></span>
              <span>Aero: <b className="text-cyan-300">{aeroMode}</b></span>
            </div>
          )}

          {/* Battery SOC & Deployment Bars */}
          <div className="space-y-2">
            {/* Battery State of Charge */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-muted flex items-center gap-1">
                  {batterySoc <= 18 ? <BatteryWarning className="size-3 text-red-400 animate-pulse" /> : <BatteryCharging className="size-3 text-cyan-400" />}
                  Battery State of Charge (SOC)
                </span>
                <span className={cn("font-bold", batterySoc <= 18 ? "text-red-400" : "text-fg")}>
                  {batterySoc}% {batterySoc <= 18 && "(MỨC BÁO ĐỘNG)"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-150",
                    batterySoc <= 18 ? "bg-red-500" : batterySoc < 40 ? "bg-amber-400" : "bg-cyan-400"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, batterySoc))}%` }}
                />
              </div>
            </div>

            {/* Electric Deployment kW */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-muted">MGU-K Electric Deployment</span>
                <span className={cn("font-bold", isClipping ? "text-red-400" : deploymentKw < 0 ? "text-amber-400" : "text-cyan-300")}>
                  {deploymentKw < 0 ? `HARVEST ${deploymentKw} kW` : `${deploymentKw} kW / 350 kW`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-150",
                    isClipping
                      ? "bg-red-500 w-0"
                      : deploymentKw < 0
                        ? "bg-amber-400"
                        : "bg-gradient-to-r from-blue-500 to-cyan-400"
                  )}
                  style={{
                    width: `${isClipping ? 0 : Math.min(100, Math.max(0, (Math.abs(deploymentKw) / 350) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-2.5 mb-2.5 rounded-lg border border-border/80 bg-surface-2/60 p-2.5 font-mono text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-fg flex items-center gap-1.5 text-[11px]">
              <Gauge className="size-3.5 text-emerald-400" />
              1.6L V6 Turbo Hybrid (MGU-K + DRS)
            </span>

            {isDrs ? (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/50 animate-pulse shadow-sm shadow-emerald-950">
                DRS ACTIVE (OPEN)
              </span>
            ) : (
              <span className="rounded bg-surface-3 px-2 py-0.5 text-[10px] text-muted border border-border">
                DRS CLOSED
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-muted">ICE Rev Limit (15,000 RPM Max)</span>
                <span className="font-bold text-fg">{rpm} RPM</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-100"
                  style={{ width: `${Math.min(100, Math.max(0, ((rpm - 4000) / 11000) * 100))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-muted">MGU-K Hybrid Deployment (120 kW Max)</span>
                <span className="font-bold text-emerald-400">
                  {speed > 0 ? (throttle > 50 ? "120 kW (FULL BOOST)" : `${Math.round(throttle * 1.2)} kW`) : "0 kW"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-100"
                  style={{ width: `${speed > 0 ? (throttle > 50 ? 100 : throttle) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECTORS SUMMARY */}
      {lastLap ? (
        <div className="grid grid-cols-4 gap-1 px-2.5 pb-2">
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

      {/* 5. LAP SPARKLINE */}
      <LapSpark laps={laps} />

      {/* 6. LAP HISTORY TABLE */}
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