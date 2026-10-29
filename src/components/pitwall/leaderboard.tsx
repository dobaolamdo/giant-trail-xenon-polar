import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Wind,
  Thermometer,
  Gauge,
  Droplets,
  CloudRain,
  ShieldCheck,
  Zap,
  BatteryCharging,
  BatteryMedium,
  BatteryWarning,
  Flame,
} from "lucide-react";
import type { LeaderboardRow } from "@/lib/f1/types";
import { formatGap, formatInterval, formatLapTime, splitName } from "@/lib/f1/format";
import { cn, onTeam, teamHex } from "@/lib/utils";
import { TyreCompound } from "./tyre";
import { getCountryFlag } from "@/lib/f1/flags";

export type CircuitHudInfo = {
  name?: string;
  country?: string;
  year?: number;
  session_name?: string;
};

export type WeatherHudData = {
  air_temperature?: number;
  track_temperature?: number;
  humidity?: number;
  wind_speed?: number;
  rainfall?: number | boolean;
  pressure?: number;
};

export function Leaderboard({
  rows,
  selected,
  onSelect,
  mode = "live",
  circuitInfo,
  weather,
  trackStatus = "Track Clear",
  elapsedSec = 0,
}: {
  rows: LeaderboardRow[];
  selected: number;
  onSelect: (n: number) => void;
  mode?: "live" | "result";
  circuitInfo?: CircuitHudInfo;
  weather?: WeatherHudData | null;
  trackStatus?: "Track Clear" | "Yellow Flag" | "Safety Car" | "Red Flag";
  elapsedSec?: number;
}) {
  const [tabMode, setTabMode] = useState<"overview" | "sectors">("overview");
  const result = mode === "result";
  const is2026 = circuitInfo?.year === 2026;

  const flag = getCountryFlag(circuitInfo?.country);
  const gpTitle = circuitInfo?.country
    ? `${circuitInfo.country} GP: ${circuitInfo.session_name || "Race"}`
    : "Grand Prix: Race";

  // Weather readouts (use realistic telemetry fallback if null)
  const airTemp = weather?.air_temperature?.toFixed(1) ?? "28.5";
  const trackTemp = weather?.track_temperature?.toFixed(1) ?? "42.0";
  const hum = weather?.humidity != null ? Math.round(Number(weather.humidity)) : "52";
  const windSpd = weather?.wind_speed?.toFixed(1) ?? "11.2";
  const isRain = weather?.rainfall ? "Yes" : "No";

  // Find fastest sector times in session for purple mini-sectors
  const sessionMinS1 = useMemo(() => {
    const vals = rows.map((r: any) => r.s1).filter((v: any) => typeof v === "number" && v > 0);
    return vals.length > 0 ? Math.min(...vals) : 32.5;
  }, [rows]);

  const sessionMinS2 = useMemo(() => {
    const vals = rows.map((r: any) => r.s2).filter((v: any) => typeof v === "number" && v > 0);
    return vals.length > 0 ? Math.min(...vals) : 38.2;
  }, [rows]);

  const sessionMinS3 = useMemo(() => {
    const vals = rows.map((r: any) => r.s3).filter((v: any) => typeof v === "number" && v > 0);
    return vals.length > 0 ? Math.min(...vals) : 26.8;
  }, [rows]);

  return (
    <section className="panel flex min-h-0 flex-1 flex-col overflow-hidden bg-black/95 font-sans border-border">
      {/* MULTIVIEWER TOP BAR: FLAG + GP TITLE + STATUS + REAL-TIME WEATHER HUD */}
      <div className="border-b border-border/80 bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Grand Prix & Track Status */}
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="Country">
              {flag}
            </span>
            <span className="font-sans text-xs font-black tracking-wide text-fg uppercase sm:text-sm">
              {gpTitle}
            </span>
            <span className="font-mono text-xs text-muted tabular">
              {circuitInfo?.year || 2024}
            </span>

            {/* F1 MultiViewer Track Status Badge */}
            <span
              className={cn(
                "ml-1.5 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase",
                trackStatus === "Track Clear"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : trackStatus === "Safety Car"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                    : "bg-red-500/20 text-red-400 border border-red-500/40"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  trackStatus === "Track Clear" ? "bg-emerald-400" : "bg-current"
                )}
              />
              {trackStatus}
            </span>

            {is2026 && (
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[9px] font-black text-cyan-300 border border-cyan-500/40">
                FIA 2026 REGS · NO DRS
              </span>
            )}
          </div>

          {/* View mode toggle (Overview / Sectors like MultiViewer) */}
          <div className="flex gap-1 rounded bg-surface-2 p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setTabMode("overview")}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors",
                tabMode === "overview"
                  ? "bg-surface-3 text-fg shadow-sm"
                  : "text-muted hover:text-fg"
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setTabMode("sectors")}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors",
                tabMode === "sectors"
                  ? "bg-surface-3 text-cyan-400 shadow-sm"
                  : "text-muted hover:text-fg"
              )}
            >
              Live Sectors
            </button>
          </div>
        </div>

        {/* MultiViewer Weather Bar */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-subtle border-t border-white/5 pt-1.5">
          <span className="inline-flex items-center gap-1 text-muted">
            <Wind className="size-3 text-cyan-400" />
            <span>Wind</span>
            <b className="text-fg">{windSpd} km/h S ↖</b>
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <Gauge className="size-3 text-amber-400" />
            <span>Track</span>
            <b className="text-fg">{trackTemp} °C</b>
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <Thermometer className="size-3 text-red-400" />
            <span>Air</span>
            <b className="text-fg">{airTemp} °C</b>
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <Droplets className="size-3 text-blue-400" />
            <span>Humidity</span>
            <b className="text-fg">{hum}%</b>
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <CloudRain className="size-3 text-indigo-400" />
            <span>Rain</span>
            <b className={weather?.rainfall ? "text-blue-400" : "text-fg"}>{isRain}</b>
          </span>
        </div>
      </div>

      {/* MULTIVIEWER COLUMN HEADERS */}
      <div
        className="col-head hidden border-b border-border/60 bg-surface-2/40 px-2 py-1.5 text-[10px] font-bold tracking-widest text-subtle uppercase md:flex md:items-center md:gap-2"
        aria-hidden
      >
        <span className="w-8 shrink-0 text-center">POS</span>
        <span className="w-12 shrink-0 text-center">CODE</span>
        <span className="w-14 shrink-0 text-center">{is2026 ? "MOM/AERO" : "DRS"}</span>
        <span className="w-16 shrink-0 text-center">GEAR/KMH</span>
        {is2026 && <span className="w-18 shrink-0 text-center">BATTERY</span>}
        <span className="min-w-0 flex-1">DRIVER / TEAM</span>
        <span className="w-16 shrink-0 text-center">STATUS</span>
        <span className="w-18 shrink-0 text-right">INT</span>
        <span className="w-18 shrink-0 text-right">LDR GAP</span>
        {tabMode === "sectors" ? (
          <span className="w-68 shrink-0 text-center text-cyan-400">SECTOR 1 · 2 · 3 (LIVE TICK)</span>
        ) : (
          <>
            <span className="w-20 shrink-0 text-right">BEST</span>
            <span className="w-6 shrink-0 text-center">TYRE</span>
          </>
        )}
      </div>

      {/* DRIVERS LIST */}
      <ol className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-white/5 pb-1">
        {rows.map((row, index) => (
          <li key={row.driver_number}>
            <DriverRow
              row={row}
              index={index}
              selected={selected === row.driver_number}
              onSelect={() => onSelect(row.driver_number)}
              tabMode={tabMode}
              minS1={sessionMinS1}
              minS2={sessionMinS2}
              minS3={sessionMinS3}
              elapsedSec={elapsedSec}
              is2026={is2026}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function DriverRow({
  row,
  index,
  selected,
  onSelect,
  tabMode,
  minS1,
  minS2,
  minS3,
  elapsedSec,
  is2026 = false,
}: {
  row: LeaderboardRow;
  index: number;
  selected: boolean;
  onSelect: () => void;
  tabMode: "overview" | "sectors";
  minS1: number;
  minS2: number;
  minS3: number;
  elapsedSec: number;
  is2026?: boolean;
}) {
  const { first, last } = splitName(row.full_name);
  const team = teamHex(row.team_colour);

  const pit = row.status === "PIT";
  const dnf = row.status === "DNF";
  const sc = row.status === "SC";
  const isLeader = row.live_rank === 1 || index === 0;

  // Acronym (e.g. VER, NOR, HAM, LEC)
  const acronym = row.code || last.slice(0, 3).toUpperCase();

  // Gap & Interval labels
  const gapLabel = dnf
    ? "DNF"
    : isLeader
      ? "LEADER"
      : typeof row.gap_to_leader === "number"
        ? `+${row.gap_to_leader.toFixed(3)}s`
        : typeof row.gap_to_leader === "string"
          ? row.gap_to_leader
          : "—";

  const intLabel = isLeader
    ? "—"
    : typeof row.gap_to_car_ahead === "number"
      ? `+${row.gap_to_car_ahead.toFixed(3)}s`
      : typeof row.gap_to_car_ahead === "string"
        ? row.gap_to_car_ahead
        : "—";

  // Live unified telemetry (speed, gear, rpm, drs, aero)
  const isMoving = !pit && !dnf;
  const simulatedSpeed = !isMoving
    ? 0
    : typeof row.speed === "number"
      ? row.speed
      : 0;
  const simulatedGear = !isMoving
    ? "N"
    : row.gear !== undefined
      ? row.gear
      : (simulatedSpeed > 260 ? 8 : simulatedSpeed > 220 ? 7 : simulatedSpeed > 170 ? 6 : simulatedSpeed > 120 ? 4 : simulatedSpeed > 0 ? 2 : 1);
  const simulatedRpm = !isMoving
    ? 0
    : typeof row.rpm === "number"
      ? row.rpm
      : (simulatedSpeed > 0 ? 10500 : 11200);

  // Pre-2026 DRS (Unified with telemetry)
  const isDrs = !is2026 && isMoving && Boolean(row.drs);

  // 2026 Regulations: MOM Overtake, Active Aero, Battery SOC, Super Clipping
  const isClipping = Boolean(row.is_clipping);
  const isOvertake = Boolean(row.overtake_mode);
  const batterySoc = typeof row.battery_soc === "number" ? row.battery_soc : 82;
  const aeroMode = row.aero_mode || (simulatedSpeed > 260 ? "X-MODE" : "Z-MODE");

  // Live Sectors from dynamic calculation in shell.tsx
  const s1 = typeof row.s1 === "number" ? row.s1 : 0;
  const s2 = typeof row.s2 === "number" ? row.s2 : 0;
  const s3 = typeof row.s3 === "number" ? row.s3 : 0;

  const s1_state = row.s1_state || (s1 > 0 ? "done" : "pending");
  const s2_state = row.s2_state || (s2 > 0 ? "done" : "pending");
  const s3_state = row.s3_state || (s3 > 0 ? "done" : "pending");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex min-h-11 w-full items-center gap-2 px-2 py-1 text-left transition-colors duration-100",
        "hover:bg-surface-2/90",
        selected ? "bg-surface-2 ring-1 ring-inset ring-accent/60" : "bg-transparent",
        dnf && "opacity-45"
      )}
    >
      {/* 1. POSITION PILL (Exact MultiViewer colored box style) */}
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-black shadow-sm"
        style={{ backgroundColor: team, color: onTeam(row.team_colour) }}
      >
        {row.live_rank}
      </span>

      {/* 2. DRIVER ACRONYM PILL (Framed with team color border) */}
      <span
        className="flex h-6 w-11 shrink-0 items-center justify-center rounded border font-mono text-xs font-black tracking-wide text-fg bg-black/60 shadow"
        style={{ borderColor: team }}
      >
        {acronym}
      </span>

      {/* 3. 2026 MOM / AERO BADGE vs PRE-2026 DRS BADGE */}
      <span className="flex w-14 shrink-0 justify-center">
        {is2026 ? (
          isClipping ? (
            <span className="rounded bg-red-600/30 px-1 py-0.2 font-mono text-[9px] font-black text-red-400 border border-red-500 animate-pulse shadow-sm shadow-red-950">
              ⚠️ CLIP
            </span>
          ) : isOvertake ? (
            <span className="rounded bg-cyan-500/25 px-1 py-0.2 font-mono text-[9px] font-black text-cyan-300 border border-cyan-400 shadow-sm shadow-cyan-950 animate-pulse">
              ⚡ MOM
            </span>
          ) : (
            <span
              className={cn(
                "rounded px-1 py-0.2 font-mono text-[8px] font-bold border",
                aeroMode === "X-MODE"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-surface-3 text-muted border-border/60"
              )}
            >
              {aeroMode}
            </span>
          )
        ) : isDrs ? (
          <span className="rounded bg-emerald-500/20 px-1 py-0.2 font-mono text-[9px] font-black tracking-wider text-emerald-400 border border-emerald-500/50 shadow-sm shadow-emerald-950">
            DRS
          </span>
        ) : (
          <span className="font-mono text-[9px] text-white/20">—</span>
        )}
      </span>

      {/* 4. GEAR & SPEED (MultiViewer round dial) */}
      <div className="flex w-16 shrink-0 flex-col items-center leading-none">
        <div className="flex items-center gap-1 font-mono text-xs font-bold text-fg">
          <span className="flex size-4 items-center justify-center rounded-full bg-white/10 text-[10px]">
            {simulatedGear}
          </span>
          <span className="tabular text-muted">{simulatedSpeed}</span>
        </div>
        <span className="font-mono text-[9px] text-subtle tabular">
          {simulatedRpm > 0 ? `${simulatedRpm}` : "0"} rpm
        </span>
      </div>

      {/* 4.5. 2026 BATTERY SOC GAUGE */}
      {is2026 && (
        <div className="flex w-18 shrink-0 flex-col items-center gap-0.5 leading-none">
          <div className="flex items-center gap-1 font-mono text-[10px] font-bold">
            {batterySoc <= 18 ? (
              <BatteryWarning className="size-3 text-red-400 animate-pulse" />
            ) : (
              <Zap className="size-3 text-amber-400" />
            )}
            <span className={cn(batterySoc <= 18 ? "text-red-400 font-black" : "text-fg")}>
              {batterySoc}%
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="h-1 w-14 overflow-hidden rounded-full bg-surface-3">
            <div
              className={cn(
                "h-full transition-all duration-150",
                batterySoc <= 18
                  ? "bg-red-500"
                  : batterySoc < 40
                    ? "bg-amber-400"
                    : "bg-cyan-400"
              )}
              style={{ width: `${Math.min(100, Math.max(0, batterySoc))}%` }}
            />
          </div>
        </div>
      )}

      {/* 5. DRIVER FULL NAME & TEAM */}
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="hidden truncate text-xs text-muted sm:inline">{first}</span>
          <span className="truncate text-sm font-black tracking-wide text-fg uppercase">
            {last}
          </span>
        </span>
        <span className="hidden truncate text-[10px] text-subtle md:block">
          {row.team_name}
        </span>
      </span>

      {/* 6. STATUS TAG (IN PIT / ON TRACK) */}
      <span className="flex w-16 shrink-0 justify-center">
        {pit ? (
          <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-400 border border-red-500/40">
            IN PIT
          </span>
        ) : dnf ? (
          <span className="rounded bg-zinc-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted border border-zinc-500/40">
            DNF
          </span>
        ) : (
          <span className="rounded bg-emerald-500/10 px-1 py-0.5 font-mono text-[9px] font-medium text-emerald-400/80">
            ON TRACK
          </span>
        )}
      </span>

      {/* 7. INT (Interval to car ahead) */}
      <span className="w-18 shrink-0 text-right font-mono text-xs tabular text-muted">
        {intLabel}
      </span>

      {/* 8. LDR GAP (Gap to Leader) */}
      <span
        className={cn(
          "w-18 shrink-0 text-right font-mono text-xs font-semibold tabular",
          isLeader ? "text-accent" : "text-fg"
        )}
      >
        {gapLabel}
      </span>

      {/* 9. MINI-SECTORS OR BEST LAP */}
      {tabMode === "sectors" ? (
        <div className="flex w-68 shrink-0 items-center justify-end gap-2.5 font-mono text-[10px]">
          <MiniSectorBlock sNumber={1} time={s1} state={s1_state} inPit={pit} />
          <MiniSectorBlock sNumber={2} time={s2} state={s2_state} inPit={pit} />
          <MiniSectorBlock sNumber={3} time={s3} state={s3_state} inPit={pit} />
        </div>
      ) : (
        <>
          <span className="hidden w-20 shrink-0 text-right font-mono text-xs tabular text-muted lg:block">
            {formatLapTime(row.last_lap || (row as any).best_lap)}
          </span>
          <span className="w-6 shrink-0 flex justify-center">
            <TyreCompound compound={row.compound} />
          </span>
        </>
      )}
    </button>
  );
}

/**
 * Segmented Mini-Sector ticks with live ticking time and states:
 * - active: Car currently inside sector (yellow pulsing bars with ticking seconds)
 * - purple: Session fastest sector (purple glow)
 * - pb: Personal best sector (green)
 * - done: Completed sector (yellow)
 * - pending: Not reached yet (gray dash)
 */
function MiniSectorBlock({
  sNumber,
  time,
  state = "pending",
  inPit,
}: {
  sNumber: number;
  time: number;
  state: "active" | "purple" | "pb" | "done" | "pending";
  inPit: boolean;
}) {
  const isPurple = state === "purple";
  const isGreen = state === "pb";
  const isActive = state === "active";
  const isDone = state === "done";
  const isPending = state === "pending";

  const tickColor = inPit
    ? "bg-zinc-700"
    : isPurple
      ? "bg-purple-500 shadow-sm shadow-purple-900"
      : isGreen
        ? "bg-emerald-400 shadow-sm shadow-emerald-900"
        : isActive
          ? "bg-amber-400 animate-pulse shadow-sm shadow-amber-900"
          : isDone
            ? "bg-amber-400/90"
            : "bg-zinc-800";

  return (
    <div className="flex flex-col items-center gap-0.5 leading-none">
      {/* 4 Segmented vertical tick bars */}
      <div className="flex items-center gap-0.5">
        <span className={cn("h-2.5 w-1 rounded-xs transition-colors", tickColor)} />
        <span className={cn("h-2.5 w-1 rounded-xs transition-colors", tickColor)} />
        <span className={cn("h-2.5 w-1 rounded-xs transition-colors", tickColor)} />
        <span className={cn("h-2.5 w-1 rounded-xs transition-colors", tickColor)} />
      </div>
      <span
        className={cn(
          "font-mono text-[9px] tabular font-medium transition-all",
          isPurple
            ? "text-purple-400 font-bold"
            : isGreen
              ? "text-emerald-400 font-semibold"
              : isActive
                ? "text-amber-300 font-bold animate-pulse"
                : isDone
                  ? "text-fg/80"
                  : "text-muted/40"
        )}
      >
        {isPending ? "—" : time ? (isActive ? `${time.toFixed(1)}s` : time.toFixed(3)) : "—"}
      </span>
    </div>
  );
}