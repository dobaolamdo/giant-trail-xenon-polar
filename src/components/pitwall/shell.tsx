import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { usePitwall } from "@/lib/f1/store";
import { TimingHeader } from "./header";
import { pullLiveOf1 } from "@/lib/f1/live-of1";
import { BAKU_RACE_KEY, bakuFallbackBoard } from "@/lib/f1/baku-fallback";
import { mergeMeta, rosterMeta } from "@/lib/f1/drivers-roster";
import {
  leaderLapAt,
  raceDurationSec,
  raceMaxLap,
  rankFromElapsed,
  rankFromLaps,
  type RankDriverMeta,
  type RankedRow,
} from "@/lib/f1/rank";
import { Leaderboard } from "./leaderboard";
import { ArchiveView } from "./archive";
import { SchemaView } from "./schema-view";
import { DriverDetail } from "./driver-detail";
import { SqlPanel } from "./sql-panel";
import { StintPitPanel } from "./stint-pit-panel";
import {
  applyLapCompounds,
  applyTyreAndPit,
  parsePits,
  parseStints,
  type Pit,
  type Stint,
} from "@/lib/f1/stints-pits";
import type {
  DriverListRow,
  LapHistoryRow,
  LeaderboardRow,
} from "@/lib/f1/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const API =
  import.meta.env.VITE_API_URL || "https://f1-dashboard-sbrl.onrender.com";

const SPEEDS = [8, 16, 32, 64] as const;
type Speed = (typeof SPEEDS)[number];

function isOpenF1Key(k: number) {
  return k >= 9000;
}

function colour(c: unknown): string {
  return String(c ?? "888888").replace(/^#/, "");
}

type RawLap = {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const ms = Math.floor((Math.max(0, sec) - s) * 1000);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

async function fetchJson(url: string, ms = 45000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function annotatePurple(
  laps: RawLap[],
  driver: number,
  upToLap: number,
): LapHistoryRow[] {
  let minS1 = Infinity;
  let minS2 = Infinity;
  let minS3 = Infinity;
  let minLap = Infinity;
  const chron = [...laps]
    .filter((l) => l.lap_number <= upToLap)
    .sort(
      (a, b) =>
        a.lap_number - b.lap_number || a.driver_number - b.driver_number,
    );
  const purpleAt = new Map<
    string,
    { s1: boolean; s2: boolean; s3: boolean; pb: boolean }
  >();
  for (const l of chron) {
    const s1 = num(l.duration_sector_1);
    const s2 = num(l.duration_sector_2);
    const s3 = num(l.duration_sector_3);
    const ld = num(l.lap_duration);
    let ps1 = false;
    let ps2 = false;
    let ps3 = false;
    let pb = false;
    if (s1 != null && s1 > 0 && s1 < minS1) {
      minS1 = s1;
      ps1 = true;
    }
    if (s2 != null && s2 > 0 && s2 < minS2) {
      minS2 = s2;
      ps2 = true;
    }
    if (s3 != null && s3 > 0 && s3 < minS3) {
      minS3 = s3;
      ps3 = true;
    }
    if (ld != null && ld > 0 && ld < minLap) {
      minLap = ld;
      pb = true;
    }
    purpleAt.set(`${l.driver_number}-${l.lap_number}`, {
      s1: ps1,
      s2: ps2,
      s3: ps3,
      pb,
    });
  }
  return chron
    .filter((l) => l.driver_number === driver)
    .map((l) => {
      const p = purpleAt.get(`${l.driver_number}-${l.lap_number}`);
      return {
        lap_number: l.lap_number,
        lap_duration: num(l.lap_duration) ?? 0,
        duration_sector_1: num(l.duration_sector_1) ?? 0,
        duration_sector_2: num(l.duration_sector_2) ?? 0,
        duration_sector_3: num(l.duration_sector_3) ?? 0,
        is_pit_out_lap: false,
        is_purple_s1: Boolean(p?.s1),
        is_purple_s2: Boolean(p?.s2),
        is_purple_s3: Boolean(p?.s3),
        is_personal_best: Boolean(p?.pb),
        compound: "MEDIUM" as const,
      };
    });
}

function rankedToUi(rows: RankedRow[]): LeaderboardRow[] {
  return rows.map((r) => ({
    live_rank: r.live_rank,
    driver_number: r.driver_number,
    full_name: r.full_name,
    team_name: r.team_name,
    team_colour: r.team_colour,
    gap_to_leader: r.gap_to_leader,
    gap_to_car_ahead: r.gap_to_car_ahead,
    last_lap: r.last_lap,
    status: r.status,
    position_change: r.position_change,
    code: r.code,
    points: r.points,
    compound: "MEDIUM",
  }));
}

function enrichNames(
  rows: LeaderboardRow[],
  meta: Map<number, RankDriverMeta>,
): LeaderboardRow[] {
  return rows.map((r) => {
    const m = meta.get(r.driver_number);
    if (!m) return r;
    const bare = !r.full_name || /^#\d+$/.test(r.full_name);
    return {
      ...r,
      full_name: bare ? (m.full_name ?? r.full_name) : r.full_name,
      team_name: r.team_name || m.team_name || "",
      team_colour: colour(
        r.team_colour && r.team_colour !== "888888"
          ? r.team_colour
          : m.team_colour,
      ),
      code: r.code || m.code,
    };
  });
}

function parseLaps(data: unknown): RawLap[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r: any) => r?.driver_number != null && r?.lap_number != null)
    .map((r: any) => ({
      driver_number: Number(r.driver_number),
      lap_number: Number(r.lap_number),
      lap_duration: num(r.lap_duration),
      duration_sector_1: num(r.duration_sector_1),
      duration_sector_2: num(r.duration_sector_2),
      duration_sector_3: num(r.duration_sector_3),
    }));
}

export function PitwallShell() {
  const sessionKey = usePitwall((s) => s.sessionKey);
  const view = usePitwall((s) => s.view);
  const setArchiveClock = usePitwall((s) => s.setArchiveClock);

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<Map<number, RankDriverMeta>>(() =>
    rosterMeta(),
  );
  const [rawLaps, setRawLaps] = useState<RawLap[]>([]);
  const [maxLap, setMaxLap] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(16);
  const [selected, setSelected] = useState(1);
  const [finalBoard, setFinalBoard] = useState<LeaderboardRow[] | null>(null);
  const [side, setSide] = useState<"driver" | "stints" | "sql">("driver");
  const [stints, setStints] = useState<Stint[]>([]);
  const [pits, setPits] = useState<Pit[]>([]);

  const maxLapRef = useRef(0);
  maxLapRef.current = maxLap;
  const durationRef = useRef(0);
  durationRef.current = durationSec;
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsedSec;
  const speedRef = useRef<Speed>(16);
  speedRef.current = speed;

  useEffect(() => {
    if (view !== "timing" || !isOpenF1Key(sessionKey)) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setPlaying(false);
      setRawLaps([]);
      setFinalBoard(null);
      setMaxLap(0);
      setCurrentLap(1);
      setElapsedSec(0);
      setDurationSec(0);
      setStints([]);
      setPits([]);
      setStatus("Loading MySQL…");

      let m = rosterMeta();
      let laps: RawLap[] = [];
      let gotLb: LeaderboardRow[] | null = null;

      const lbP = fetchJson(
        `${API}/api/leaderboard?session_key=${sessionKey}`,
      ).catch(() => null);
      const lapsP = fetchJson(
        `${API}/api/session-laps?session_key=${sessionKey}`,
        60000,
      ).catch(() => null);
      const stintsP = fetchJson(
        `https://api.openf1.org/v1/stints?session_key=${sessionKey}`,
        30000,
      ).catch(() => null);
      const pitsP = fetchJson(
        `https://api.openf1.org/v1/pit?session_key=${sessionKey}`,
        30000,
      ).catch(() => null);

      const [lbData, lapsData, stintsData, pitsData] = await Promise.all([
        lbP,
        lapsP,
        stintsP,
        pitsP,
      ]);
      if (cancelled) return;

      setStints(parseStints(stintsData));
      setPits(parsePits(pitsData));

      if (Array.isArray(lbData) && lbData.length > 0) {
        const fromLb = new Map<number, RankDriverMeta>();
        for (const r of lbData as any[]) {
          const n = Number(r.driver_number);
          if (!n) continue;
          fromLb.set(n, {
            full_name: String(r.full_name ?? r.name_acronym ?? `#${n}`),
            team_name: String(r.team_name ?? ""),
            team_colour: colour(r.team_colour),
            code: r.name_acronym != null ? String(r.name_acronym) : undefined,
          });
        }
        m = mergeMeta(m, fromLb);
        gotLb = enrichNames(
          (lbData as any[]).map((r, i) => ({
            live_rank: Number(r.position ?? r.live_rank ?? i + 1),
            driver_number: Number(r.driver_number),
            full_name: String(
              r.full_name ?? r.name_acronym ?? `#${r.driver_number}`,
            ),
            team_name: String(r.team_name ?? ""),
            team_colour: colour(r.team_colour),
            gap_to_leader:
              r.gap_to_leader != null && r.gap_to_leader !== ""
                ? Number(r.gap_to_leader)
                : null,
            gap_to_car_ahead: null,
            last_lap:
              r.lap_duration != null && r.lap_duration !== ""
                ? Number(r.lap_duration)
                : null,
            status: r.dnf || r.status === "DNF" ? "DNF" : null,
            position_change: 0,
            code: r.name_acronym != null ? String(r.name_acronym) : undefined,
            points: r.points != null ? Number(r.points) : undefined,
            compound: "MEDIUM" as const,
          })),
          m,
        );
      }

      laps = parseLaps(lapsData);

      if (laps.length === 0) {
        try {
          const r = await pullLiveOf1(sessionKey);
          if (cancelled) return;
          if (r.drivers?.size) m = mergeMeta(m, r.drivers);
          if (r.laps?.length) {
            laps = r.laps.map((l) => ({
              driver_number: l.driver_number,
              lap_number: l.lap_number,
              lap_duration: num(l.lap_duration),
              duration_sector_1: num(l.duration_sector_1),
              duration_sector_2: num(l.duration_sector_2),
              duration_sector_3: num(l.duration_sector_3),
            }));
          }
          if (r.board?.length && !gotLb) {
            gotLb = enrichNames(rankedToUi(r.board), m);
          }
        } catch {
          /* */
        }
      }

      if (
        sessionKey === BAKU_RACE_KEY &&
        laps.length === 0 &&
        !gotLb?.length
      ) {
        gotLb = enrichNames(rankedToUi(bakuFallbackBoard()), m);
      }

      if (cancelled) return;

      const mx =
        raceMaxLap(laps) ||
        laps.reduce((a, l) => Math.max(a, l.lap_number), 0);
      const dur = raceDurationSec(laps);
      setMeta(m);
      setRawLaps(laps);
      setMaxLap(mx);
      setDurationSec(dur);
      setFinalBoard(gotLb);
      setCurrentLap(mx > 0 ? 1 : 0);
      setElapsedSec(0);

      const firstDriver =
        gotLb?.[0]?.driver_number ?? (laps[0]?.driver_number || 1);
      setSelected(firstDriver);

      if (laps.length > 0 && mx > 0 && dur > 0) {
        setStatus(
          `▶ Replay · ${laps.length} rows · ${formatClock(dur)} · x8–x64`,
        );
      } else if (gotLb?.length) {
        setStatus(`Kết quả cuối · ${gotLb.length} xe (không có lap replay)`);
      } else {
        setStatus("Không có data — Archive chọn chặng đã pump");
      }

      setArchiveClock({
        maxLap: mx || gotLb?.length || 0,
        lap: mx > 0 ? 1 : 0,
        elapsed: 0,
        duration: dur || mx,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [view, sessionKey, setArchiveClock]);

  useEffect(() => {
    if (!playing || durationRef.current <= 0) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = elapsedRef.current + dt * speedRef.current;
      if (next >= durationRef.current) {
        setElapsedSec(durationRef.current);
        setCurrentLap(maxLapRef.current);
        setPlaying(false);
        return;
      }
      setElapsedSec(next);
      setCurrentLap(Math.max(1, leaderLapAt(rawLaps, next)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rawLaps]);

  useEffect(() => {
    if (maxLap > 0) {
      setArchiveClock({
        lap: currentLap,
        maxLap,
        elapsed: elapsedSec,
        duration: durationSec || maxLap,
      });
    }
  }, [currentLap, maxLap, elapsedSec, durationSec, setArchiveClock]);

  const canReplay = rawLaps.length > 0 && maxLap > 0 && durationSec > 0;

  const board: LeaderboardRow[] = useMemo(() => {
    let rows: LeaderboardRow[] = [];
    if (canReplay && (elapsedSec > 0 || playing || currentLap > 0)) {
      const t = elapsedSec > 0 ? elapsedSec : 0.001;
      rows = enrichNames(rankedToUi(rankFromElapsed(rawLaps, meta, t)), meta);
    } else if (finalBoard?.length) {
      rows = enrichNames(finalBoard, meta);
    }
    if (!rows.length) return rows;
    const lapForTyre = Math.max(
      1,
      currentLap || leaderLapAt(rawLaps, elapsedSec),
    );
    return applyTyreAndPit(rows, stints, pits, lapForTyre);
  }, [
    canReplay,
    rawLaps,
    meta,
    elapsedSec,
    playing,
    currentLap,
    finalBoard,
    stints,
    pits,
  ]);

  const driverRow = board.find((b) => b.driver_number === selected);
  const driverList: DriverListRow | undefined = useMemo(() => {
    const md = meta.get(selected);
    if (!md && !driverRow) return undefined;
    return {
      driver_number: selected,
      full_name: md?.full_name ?? driverRow?.full_name ?? `#${selected}`,
      team_name: md?.team_name ?? driverRow?.team_name ?? "",
      team_colour: colour(md?.team_colour ?? driverRow?.team_colour ?? "888888"),
      name_acronym: md?.code ?? driverRow?.code,
      headshot_url: null,
    };
  }, [meta, selected, driverRow]);

  const driverLaps = useMemo(() => {
    if (!canReplay) return [];
    const base = annotatePurple(rawLaps, selected, currentLap || maxLap);
    return applyLapCompounds(base, stints, pits, selected);
  }, [canReplay, rawLaps, selected, currentLap, maxLap, stints, pits]);

  const togglePlay = useCallback(() => {
    if (!canReplay || durationSec <= 0) return;
    if (elapsedSec >= durationSec - 0.05) {
      setElapsedSec(0);
      setCurrentLap(1);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [canReplay, durationSec, elapsedSec]);

  const restart = useCallback(() => {
    if (!canReplay) return;
    setElapsedSec(0);
    setCurrentLap(1);
    setPlaying(true);
  }, [canReplay]);

  if (view === "standings") {
    return (
      <div className="flex min-h-dvh flex-col">
        <TimingHeader />
        <ArchiveView />
      </div>
    );
  }
  if (view === "schema") {
    return (
      <div className="flex min-h-dvh flex-col">
        <TimingHeader />
        <SchemaView />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TimingHeader />

      {isOpenF1Key(sessionKey) && (
        <div
          className={cn(
            "mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs sm:mx-4",
            canReplay
              ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40"
              : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              canReplay ? "bg-emerald-400 live-dot" : "bg-amber-400",
            )}
          />
          <span className="font-mono tracking-wide">
            {loading ? "Loading…" : status || `Session ${sessionKey}`}
          </span>
          <span className="ml-auto text-[10px] uppercase opacity-70">
            key {sessionKey}
            {durationSec > 0
              ? ` · ${formatClock(elapsedSec)}`
              : maxLap > 0
                ? ` · L${currentLap}/${maxLap}`
                : ""}
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 py-2 lg:flex-row lg:px-4">
        {board.length > 0 ? (
          <>
            <div className="flex min-h-0 min-w-0 flex-[1.4] flex-col">
              <Leaderboard
                rows={board}
                selected={selected}
                onSelect={(n) => {
                  setSelected(n);
                  setSide("driver");
                }}
                mode={canReplay ? "live" : "result"}
              />
            </div>

            <div className="flex h-[min(42vh,360px)] w-full shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface lg:h-auto lg:min-h-0 lg:w-[380px] lg:max-w-[40%]">
              <div className="flex gap-1 border-b border-border p-2">
                <Button
                  size="sm"
                  variant={side === "driver" ? "secondary" : "ghost"}
                  className="flex-1"
                  onClick={() => setSide("driver")}
                >
                  Driver
                </Button>
                <Button
                  size="sm"
                  variant={side === "stints" ? "secondary" : "ghost"}
                  className="flex-1"
                  onClick={() => setSide("stints")}
                >
                  Stints
                </Button>
                <Button
                  size="sm"
                  variant={side === "sql" ? "secondary" : "ghost"}
                  className="flex-1"
                  onClick={() => setSide("sql")}
                >
                  SQL
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {side === "driver" ? (
                  <DriverDetail
                    driver={driverList}
                    row={driverRow}
                    laps={driverLaps}
                  />
                ) : side === "stints" ? (
                  <StintPitPanel
                    stints={stints}
                    pits={pits}
                    selected={selected}
                    currentLap={currentLap}
                    meta={meta}
                    scope="selected"
                  />
                ) : (
                  <SqlPanel
                    sessionKey={sessionKey}
                    selected={selected}
                    currentLap={currentLap}
                    maxLap={maxLap}
                    driverLaps={driverLaps}
                    board={board}
                    canReplay={canReplay}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-md text-sm text-muted">
              {loading
                ? "Đang tải leaderboard + laps từ MySQL…"
                : "Chưa có data. Archive → 2024 → Watch chặng đã pump."}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => usePitwall.getState().openArchive()}
            >
              Open Archive
            </Button>
          </div>
        )}
      </div>

      {canReplay && (
        <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 px-3 py-2.5 backdrop-blur sm:px-4">
          <div className="mb-2">
            <Slider
              min={0}
              max={Math.max(1, Math.round(durationSec * 10))}
              step={1}
              value={[
                Math.min(
                  Math.round(durationSec * 10),
                  Math.max(0, Math.round(elapsedSec * 10)),
                ),
              ]}
              onValueChange={(v) => {
                setPlaying(false);
                const sec = (v[0] ?? 0) / 10;
                setElapsedSec(sec);
                setCurrentLap(Math.max(1, leaderLapAt(rawLaps, sec)));
              }}
              aria-label="Race time"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing && elapsedSec < durationSec ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={restart}
              aria-label="Restart"
            >
              <RotateCcw className="size-4" />
            </Button>
            <div className="flex items-center gap-1">
              {SPEEDS.map((s) => (
                <Button
                  key={s}
                  variant={speed === s ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSpeed(s)}
                  className="min-w-10 px-2"
                >
                  {s}x
                </Button>
              ))}
            </div>
            <span className="ml-auto font-mono text-xs text-muted tabular">
              {formatClock(elapsedSec)} / {formatClock(durationSec)}
              {maxLap > 0 ? ` · L${currentLap}/${maxLap}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
