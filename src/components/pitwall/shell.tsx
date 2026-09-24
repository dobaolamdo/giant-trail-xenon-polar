import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Get_Driver_Lap_History,
  Get_Driver_List,
  Get_Live_Leaderboard,
  Get_Meeting,
  Get_Pit_Stops,
  Get_Race_Control_Until,
  getFeed,
  hasTimingFeed,
  isLiveSession,
} from "@/lib/f1/api";
import type {
  DriverListRow,
  LapHistoryRow,
  LeaderboardRow,
} from "@/lib/f1/types";
import { useRaceClock } from "@/lib/f1/clock";
import { usePitwall } from "@/lib/f1/store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TimingHeader } from "./header";
import { PlaybackBar } from "./playback";
import { Leaderboard } from "./leaderboard";
import { DriverDetail } from "./driver-detail";
import { RaceControlList, RaceControlTicker } from "./race-control";
import { PitStopTable } from "./pit-stops";
import { RaceTicker, useKeyboardPlayback } from "./race-ticker";
import { ArchiveView } from "./archive";
import { SchemaView } from "./schema-view";
import { PurpleAlert } from "./purple-alert";
import { TracePanel } from "./trace-panel";

type SideTab = "driver" | "control" | "pits" | "trace";
type RawLap = {
  driver_number: number;
  lap_number: number;
  lap_duration: number | string | null;
  duration_sector_1?: number | string | null;
  duration_sector_2?: number | string | null;
  duration_sector_3?: number | string | null;
  is_purple_s1?: number | boolean;
  is_purple_s2?: number | boolean;
  is_purple_s3?: number | boolean;
};
type DriverMeta = {
  full_name: string;
  team_name: string;
  team_colour: string;
  code?: string;
};

const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const PLAY_SPEEDS = [0.5, 1, 2, 4] as const;

function pointsForRank(rank: number): number {
  if (rank < 1 || rank > F1_POINTS.length) return 0;
  return F1_POINTS[rank - 1]!;
}

function boardAtLap(
  laps: RawLap[],
  meta: Map<number, DriverMeta>,
  upToLap: number,
  withPoints: boolean,
): LeaderboardRow[] {
  const cum = new Map<number, number>();
  const last = new Map<number, number>();
  for (const l of laps) {
    if (l.lap_number > upToLap) continue;
    const d = Number(l.lap_duration);
    if (!Number.isFinite(d) || d <= 0) continue;
    const n = Number(l.driver_number);
    cum.set(n, (cum.get(n) ?? 0) + d);
    if (l.lap_number === upToLap) last.set(n, d);
  }
  const ordered = [...cum.entries()].sort((a, b) => a[1] - b[1]);
  const leaderT = ordered[0]?.[1] ?? 0;
  return ordered.map(([num, total], i) => {
    const m = meta.get(num);
    const prev = i === 0 ? null : ordered[i - 1]![1];
    const rank = i + 1;
    return {
      live_rank: rank,
      driver_number: num,
      full_name: m?.full_name ?? `#${num}`,
      team_name: m?.team_name ?? "",
      team_colour: (m?.team_colour ?? "888888").replace(/^#/, ""),
      gap_to_leader: i === 0 ? null : total - leaderT,
      gap_to_car_ahead: prev == null ? null : total - prev,
      last_lap: last.get(num) ?? null,
      status: null,
      position_change: 0,
      code: m?.code,
      points: withPoints ? pointsForRank(rank) : undefined,
    };
  });
}

function mapApiLeaderboard(
  data: Record<string, unknown>[],
  withPoints: boolean,
): LeaderboardRow[] {
  const rows = data
    .map((r) => {
      const rank = Number(r.position ?? 0);
      return {
        live_rank: rank,
        driver_number: Number(r.driver_number),
        full_name: String(r.full_name ?? ""),
        team_name: String(r.team_name ?? ""),
        team_colour: String(r.team_colour ?? "888888").replace(/^#/, ""),
        gap_to_leader: null as number | null,
        gap_to_car_ahead: null as number | null,
        last_lap: r.lap_duration != null ? Number(r.lap_duration) : null,
        status: null as LeaderboardRow["status"],
        position_change: 0,
        code: r.name_acronym != null ? String(r.name_acronym) : undefined,
        points: withPoints ? pointsForRank(rank) : undefined,
      };
    })
    .filter((r) => r.driver_number > 0)
    .sort((a, b) => a.live_rank - b.live_rank);
  const withTime = data
    .map((r) => ({
      num: Number(r.driver_number),
      t: r.total_time != null ? Number(r.total_time) : null,
      pos: Number(r.position ?? 0),
    }))
    .filter((x) => x.t != null && Number.isFinite(x.t!))
    .sort((a, b) => a.pos - b.pos);
  if (withTime.length > 0) {
    const leaderT = withTime[0]!.t!;
    const byNum = new Map(withTime.map((x) => [x.num, x.t!]));
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const t = byNum.get(row.driver_number);
      if (t == null) continue;
      row.gap_to_leader = row.live_rank === 1 ? null : t - leaderT;
      if (i > 0) {
        const pt = byNum.get(rows[i - 1]!.driver_number);
        if (pt != null) row.gap_to_car_ahead = t - pt;
      }
    }
  }
  return rows;
}

function lapsForDriver(
  all: RawLap[],
  driverNumber: number,
  upToLap: number,
): LapHistoryRow[] {
  const mine = all
    .filter(
      (l) =>
        Number(l.driver_number) === driverNumber &&
        l.lap_number <= upToLap &&
        Number(l.lap_duration) > 0,
    )
    .sort((a, b) => a.lap_number - b.lap_number);
  let best = Infinity;
  for (const l of mine) {
    const d = Number(l.lap_duration);
    if (d > 0 && d < best) best = d;
  }
  return mine.map((l) => {
    const lap_duration = Number(l.lap_duration) || 0;
    return {
      lap_number: l.lap_number,
      lap_duration,
      duration_sector_1: Number(l.duration_sector_1) || 0,
      duration_sector_2: Number(l.duration_sector_2) || 0,
      duration_sector_3: Number(l.duration_sector_3) || 0,
      is_purple_s1: Boolean(l.is_purple_s1),
      is_purple_s2: Boolean(l.is_purple_s2),
      is_purple_s3: Boolean(l.is_purple_s3),
      compound: "UNKNOWN",
      is_pit_out_lap: false,
      is_personal_best: lap_duration > 0 && lap_duration <= best + 0.0005,
    };
  });
}

function fmtSec(v: number | string | null | undefined): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toFixed(3);
}
function fmtLap(v: number | string | null | undefined): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const m = Math.floor(n / 60);
  const s = n - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

export function PitwallShell() {
  const elapsed = useRaceClock((s) => s.elapsed);
  const selected = useRaceClock((s) => s.selectedDriver);
  const selectDriver = useRaceClock((s) => s.selectDriver);
  const bindSession = useRaceClock((s) => s.bindSession);
  const sessionKey = usePitwall((s) => s.sessionKey);
  const view = usePitwall((s) => s.view);
  const setArchiveClock = usePitwall((s) => s.setArchiveClock);
  const live = isLiveSession(sessionKey);
  const replay = hasTimingFeed(sessionKey);
  const [tab, setTab] = useState<SideTab>("driver");
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOpenF1 = sessionKey >= 9000;
  const [meta, setMeta] = useState<Map<number, DriverMeta>>(new Map());
  const [rawLaps, setRawLaps] = useState<RawLap[]>([]);
  const [finishBoard, setFinishBoard] = useState<LeaderboardRow[] | null>(null);
  const [maxLap, setMaxLap] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [lapsLoading, setLapsLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [archiveElapsed, setArchiveElapsed] = useState(0);
  const [of1Control, setOf1Control] = useState<any[]>([]);
  const [of1Pits, setOf1Pits] = useState<any[]>([]);

  useKeyboardPlayback();

  useEffect(() => {
    const feed = getFeed(sessionKey);
    if (!feed) return;
    const start = live ? (feed.snapshots[18]?.time ?? 0) : 0;
    const meeting = Get_Meeting(sessionKey);
    const driver = live
      ? 4
      : (meeting?.winner_number ?? feed.driverList[0]?.driver_number);
    bindSession(feed.duration, start, driver);
  }, [sessionKey, live, bindSession]);

  useEffect(() => {
    if (!isOpenF1) {
      setRawLaps([]);
      setMeta(new Map());
      setFinishBoard(null);
      setMaxLap(0);
      setPlaying(false);
      setArchiveElapsed(0);
      setOf1Control([]);
      setOf1Pits([]);
      setArchiveClock({ elapsed: 0, duration: 0, lap: 1, maxLap: 0, weather: null });
      return;
    }
    const base =
      import.meta.env.VITE_API_URL || "https://f1-dashboard-sbrl.onrender.com";
    let cancelled = false;
    setLapsLoading(true);
    setPlaying(false);
    (async () => {
      try {
        const [boardRes, lapsRes] = await Promise.all([
          fetch(`${base}/api/leaderboard?session_key=${sessionKey}`),
          fetch(`${base}/api/session-laps?session_key=${sessionKey}`),
        ]);
        const boardData = await boardRes.json();
        const lapsData = await lapsRes.json();
        if (cancelled) return;
        const m = new Map<number, DriverMeta>();
        if (Array.isArray(boardData)) {
          for (const r of boardData) {
            m.set(Number(r.driver_number), {
              full_name: String(r.full_name ?? ""),
              team_name: String(r.team_name ?? ""),
              team_colour: String(r.team_colour ?? "888888"),
              code: r.name_acronym != null ? String(r.name_acronym) : undefined,
            });
          }
          setFinishBoard(mapApiLeaderboard(boardData, true));
        } else setFinishBoard(null);
        setMeta(m);
        const laps: RawLap[] = Array.isArray(lapsData)
          ? lapsData.map((r: Record<string, unknown>) => ({
              driver_number: Number(r.driver_number),
              lap_number: Number(r.lap_number),
              lap_duration: r.lap_duration as any,
              duration_sector_1: r.duration_sector_1 as any,
              duration_sector_2: r.duration_sector_2 as any,
              duration_sector_3: r.duration_sector_3 as any,
              is_purple_s1: r.is_purple_s1 as any,
              is_purple_s2: r.is_purple_s2 as any,
              is_purple_s3: r.is_purple_s3 as any,
            }))
          : [];
        setRawLaps(laps);
        const mx = laps.reduce((a, l) => Math.max(a, l.lap_number), 0);
        setMaxLap(mx);
        setCurrentLap(1);
        setArchiveElapsed(0);
        const first = [...m.keys()][0];
        if (first != null) selectDriver(first);
        try {
          const wRes = await fetch(
            `https://api.openf1.org/v1/weather?session_key=${sessionKey}`,
          );
          const wData = await wRes.json();
          if (!cancelled && Array.isArray(wData) && wData.length > 0) {
            const mid = wData[Math.floor(wData.length / 2)]!;
            setArchiveClock({
              weather: {
                air_temperature: Number(mid.air_temperature) || 0,
                track_temperature: Number(mid.track_temperature) || 0,
                humidity: Number(mid.humidity) || 0,
                wind_speed: Number(mid.wind_speed) || 0,
                rainfall: Number(mid.rainfall) || 0,
              },
            });
          }
        } catch {}
        try {
          const [rcRes, pitRes] = await Promise.all([
            fetch(`https://api.openf1.org/v1/race_control?session_key=${sessionKey}`),
            fetch(`https://api.openf1.org/v1/pit?session_key=${sessionKey}`),
          ]);
          const rcData = await rcRes.json();
          const pitData = await pitRes.json();
          if (!cancelled && Array.isArray(rcData)) {
            setOf1Control(
              rcData.map((r: any) => ({
                date: String(r.date ?? ""),
                category: String(r.category ?? ""),
                flag: String(r.flag ?? r.category ?? ""),
                scope: String(r.scope ?? ""),
                driver_number: r.driver_number != null ? Number(r.driver_number) : null,
                message: String(r.message ?? ""),
                lap_number: r.lap_number != null ? Number(r.lap_number) : null,
              })),
            );
          }
          if (!cancelled && Array.isArray(pitData)) {
            setOf1Pits(
              pitData
                .filter((r: any) => r.driver_number != null)
                .map((r: any) => {
                  const num = Number(r.driver_number);
                  const dm = m.get(num);
                  return {
                    driver_number: num,
                    full_name: dm?.full_name ?? `#${num}`,
                    lap_number: Number(r.lap_number) || 0,
                    stop_duration: Number(r.stop_duration ?? r.pit_duration) || 0,
                    lane_duration: Number(r.lane_duration ?? r.pit_duration) || 0,
                  };
                }),
            );
          }
        } catch {}
      } catch {
        if (!cancelled) {
          setRawLaps([]);
          setMeta(new Map());
          setFinishBoard(null);
          setMaxLap(0);
        }
      } finally {
        if (!cancelled) setLapsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionKey, isOpenF1, selectDriver, setArchiveClock]);

  const leaderCum = useMemo(() => {
    if (!isOpenF1 || rawLaps.length === 0) return [] as number[];
    const byDriver = new Map<number, { n: number; times: number[] }>();
    for (const l of rawLaps) {
      const d = Number(l.lap_duration);
      if (!Number.isFinite(d) || d <= 0) continue;
      const num = Number(l.driver_number);
      let e = byDriver.get(num);
      if (!e) {
        e = { n: 0, times: [] };
        byDriver.set(num, e);
      }
      e.n++;
      e.times.push(d);
    }
    let best: number[] = [];
    let bestN = 0;
    for (const e of byDriver.values()) {
      if (e.n > bestN) {
        bestN = e.n;
        let c = 0;
        best = e.times.map((t) => {
          c += t;
          return c;
        });
      }
    }
    return best;
  }, [isOpenF1, rawLaps]);

  const raceDuration = leaderCum.length ? leaderCum[leaderCum.length - 1]! : 0;

  function lapAtElapsed(t: number): number {
    if (leaderCum.length === 0) return 1;
    let lap = 1;
    for (let i = 0; i < leaderCum.length; i++) {
      if (leaderCum[i]! <= t) lap = i + 1;
      else break;
    }
    return Math.min(lap, maxLap || leaderCum.length);
  }

  useEffect(() => {
    if (!playing || !isOpenF1 || raceDuration <= 0) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setArchiveElapsed((e) => {
        const next = e + dt * playSpeed;
        if (next >= raceDuration) {
          setPlaying(false);
          setCurrentLap(maxLap);
          return raceDuration;
        }
        setCurrentLap(lapAtElapsed(next));
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, isOpenF1, raceDuration, playSpeed, maxLap]);

  useEffect(() => {
    if (!isOpenF1) return;
    setArchiveClock({
      elapsed: archiveElapsed,
      duration: raceDuration,
      lap: currentLap,
      maxLap,
    });
  }, [isOpenF1, archiveElapsed, raceDuration, currentLap, maxLap, setArchiveClock]);

  const apiBoard = useMemo(() => {
    if (!isOpenF1) return null;
    const finished = raceDuration > 0 && archiveElapsed >= raceDuration - 0.25;
    if (finished && finishBoard?.length) return finishBoard;
    if (rawLaps.length === 0) return finishBoard;
    return boardAtLap(rawLaps, meta, currentLap, false);
  }, [isOpenF1, raceDuration, archiveElapsed, currentLap, finishBoard, rawLaps, meta]);

  const simBoard = useMemo(
    () => Get_Live_Leaderboard(sessionKey, elapsed),
    [sessionKey, elapsed],
  );
  const board = apiBoard ?? simBoard;
  const atFinish =
    isOpenF1 && raceDuration > 0 && archiveElapsed >= raceDuration - 0.25;
  const activeNumber =
    selected || board[0]?.driver_number || [...meta.keys()][0] || 0;
  const row = board.find((r) => r.driver_number === activeNumber) ?? board[0];

  const displayDriver: DriverListRow | undefined = useMemo(() => {
    if (!isOpenF1) {
      const list = Get_Driver_List(sessionKey);
      return list.find((d) => d.driver_number === selected) ?? list[0];
    }
    if (!row) return undefined;
    const m = meta.get(row.driver_number);
    return {
      driver_number: row.driver_number,
      full_name: row.full_name || m?.full_name || `#${row.driver_number}`,
      team_name: row.team_name || m?.team_name || "",
      team_colour: row.team_colour || m?.team_colour || "888888",
      headshot_url: "",
      code: row.code || m?.code || "",
    };
  }, [isOpenF1, sessionKey, selected, row, meta]);

  const displayLaps = useMemo(() => {
    if (!isOpenF1) return Get_Driver_Lap_History(sessionKey, activeNumber, elapsed);
    return lapsForDriver(rawLaps, activeNumber, currentLap);
  }, [isOpenF1, sessionKey, activeNumber, elapsed, rawLaps, currentLap]);

  const pits = useMemo(() => {
    if (isOpenF1) return of1Pits.filter((p) => p.lap_number <= currentLap);
    return Get_Pit_Stops(sessionKey, elapsed);
  }, [isOpenF1, of1Pits, currentLap, sessionKey, elapsed]);

  const control = useMemo(() => {
    if (isOpenF1)
      return of1Control.filter(
        (c) => c.lap_number == null || c.lap_number <= currentLap,
      );
    return Get_Race_Control_Until(sessionKey, elapsed);
  }, [isOpenF1, of1Control, currentLap, sessionKey, elapsed]);

  const sampleLap = useMemo(() => {
    if (!isOpenF1 || rawLaps.length === 0) return null;
    return (
      rawLaps.find(
        (l) =>
          Number(l.driver_number) === activeNumber &&
          l.lap_number === currentLap &&
          Number(l.lap_duration) > 0,
      ) ||
      rawLaps.find(
        (l) =>
          Number(l.driver_number) === activeNumber && Number(l.lap_duration) > 0,
      ) ||
      rawLaps.find((l) => Number(l.lap_duration) > 0) ||
      null
    );
  }, [isOpenF1, rawLaps, activeNumber, currentLap]);

  function pick(n: number) {
    selectDriver(n);
    setTab("driver");
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    )
      setMobileOpen(true);
  }

  const side = (
    <SidePanel
      tab={tab}
      onTab={setTab}
      driver={displayDriver}
      row={row}
      laps={displayLaps}
      pits={pits}
      control={control}
      live={replay}
      showControlPits={replay || isOpenF1}
      showSql
      board={board}
      sessionKey={sessionKey}
      elapsed={elapsed}
      selectedDriver={activeNumber}
      sampleLap={sampleLap}
      meta={meta}
      currentLap={currentLap}
      isOpenF1={isOpenF1}
    />
  );

  const clockLabel = `${Math.floor(archiveElapsed / 60)}:${String(
    Math.floor(archiveElapsed % 60),
  ).padStart(2, "0")}`;

  return (
    <div className="flex min-h-dvh flex-col">
      {replay && view === "timing" && <RaceTicker />}
      <TimingHeader />
      {view === "standings" ? (
        <ArchiveView />
      ) : view === "schema" ? (
        <SchemaView />
      ) : (
        <>
          {replay && <RaceControlTicker />}
          {replay && <PurpleAlert />}
          <div
            className={`flex min-h-0 flex-1 flex-col gap-3 px-3 lg:flex-row sm:px-4 ${
              isOpenF1 && maxLap > 0 ? "pb-20" : "pb-3"
            }`}
          >
            <Leaderboard
              rows={board}
              selected={activeNumber}
              onSelect={pick}
              mode={
                atFinish ? "result" : apiBoard ? "live" : replay ? "live" : "result"
              }
            />
            <aside className="panel hidden min-h-0 w-96 shrink-0 flex-col overflow-hidden lg:flex">
              {side}
            </aside>
          </div>
          {isOpenF1 && maxLap > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center gap-2 border-t border-border bg-surface/95 px-3 py-2 backdrop-blur-sm sm:gap-3 sm:px-4">
              <span className="text-xs tracking-widest text-muted uppercase">
                {lapsLoading
                  ? "Loading…"
                  : atFinish
                    ? `Finish · ${maxLap}`
                    : `Lap ${currentLap}/${maxLap} · ${clockLabel}`}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(1, Math.round(raceDuration))}
                value={Math.min(archiveElapsed, raceDuration)}
                onChange={(e) => {
                  setPlaying(false);
                  const t = Number(e.target.value);
                  setArchiveElapsed(t);
                  setCurrentLap(lapAtElapsed(t));
                }}
                className="min-w-[8rem] flex-1"
              />
              <Button
                size="sm"
                variant={playing ? "default" : "secondary"}
                onClick={() => {
                  if (archiveElapsed >= raceDuration - 0.5) {
                    setArchiveElapsed(0);
                    setCurrentLap(1);
                  }
                  setPlaying((p) => !p);
                }}
              >
                {playing ? "Pause" : "Play"}
              </Button>
              <div className="flex gap-1">
                {PLAY_SPEEDS.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={playSpeed === s ? "default" : "ghost"}
                    className="min-w-10 px-2"
                    onClick={() => setPlaySpeed(s)}
                  >
                    {s}×
                  </Button>
                ))}
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentLap <= 1}
                onClick={() => {
                  setPlaying(false);
                  const lap = Math.max(1, currentLap - 1);
                  setCurrentLap(lap);
                  setArchiveElapsed(lap <= 1 ? 0 : (leaderCum[lap - 2] ?? 0));
                }}
              >
                −
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentLap >= maxLap}
                onClick={() => {
                  setPlaying(false);
                  const lap = Math.min(maxLap, currentLap + 1);
                  setCurrentLap(lap);
                  setArchiveElapsed(leaderCum[lap - 1] ?? raceDuration);
                }}
              >
                +
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setPlaying(false);
                  setCurrentLap(maxLap);
                  setArchiveElapsed(raceDuration);
                }}
              >
                End
              </Button>
            </div>
          )}
          {replay && !apiBoard && <PlaybackBar />}
        </>
      )}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="bottom" className="sheet-mobile">
          <SheetHeader>
            <SheetTitle>Car detail</SheetTitle>
            <SheetDescription>Lap / sector times</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">{side}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SidePanel({
  tab,
  onTab,
  driver,
  row,
  laps,
  pits,
  control,
  live,
  showControlPits = false,
  showSql = false,
  board,
  sessionKey,
  elapsed,
  selectedDriver,
  sampleLap,
  meta,
  currentLap,
  isOpenF1,
}: {
  tab: SideTab;
  onTab: (t: SideTab) => void;
  driver: DriverListRow | undefined;
  row: LeaderboardRow | undefined;
  laps: LapHistoryRow[];
  pits: any[];
  control: any[];
  live: boolean;
  showControlPits?: boolean;
  showSql?: boolean;
  board: LeaderboardRow[];
  sessionKey: number;
  elapsed: number;
  selectedDriver?: number;
  sampleLap?: RawLap | null;
  meta?: Map<number, DriverMeta>;
  currentLap?: number;
  isOpenF1?: boolean;
}) {
  const drv = selectedDriver ?? board[0]?.driver_number ?? 0;
  const code =
    meta?.get(drv)?.code ||
    board.find((r) => r.driver_number === drv)?.code ||
    String(drv);
  const purpleFired =
    sampleLap &&
    (Boolean(sampleLap.is_purple_s1) ||
      Boolean(sampleLap.is_purple_s2) ||
      Boolean(sampleLap.is_purple_s3));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 p-2">
        <TabBtn active={tab === "driver"} onClick={() => onTab("driver")}>
          Driver
        </TabBtn>
        {(live || showControlPits) && (
          <TabBtn active={tab === "control"} onClick={() => onTab("control")}>
            Control
          </TabBtn>
        )}
        {(live || showControlPits) && (
          <TabBtn active={tab === "pits"} onClick={() => onTab("pits")}>
            Pits
          </TabBtn>
        )}
        {(live || showSql) && (
          <TabBtn active={tab === "trace"} onClick={() => onTab("trace")}>
            SQL
          </TabBtn>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "driver" && (
          <DriverDetail driver={driver} row={row} laps={laps} />
        )}
        {(live || showControlPits) && tab === "control" && (
          <div className="h-full overflow-y-auto">
            <RaceControlList messages={control} />
          </div>
        )}
        {(live || showControlPits) && tab === "pits" && (
          <div className="h-full overflow-y-auto">
            <PitStopTable stops={pits} />
          </div>
        )}
        {(live || showSql) && tab === "trace" && (
          <div className="h-full space-y-3 overflow-y-auto p-3 font-mono text-xs">
            <div className="rounded-md bg-surface-2 p-3">
              <p className="mb-2 tracking-widest text-subtle uppercase">1. Pump</p>
              <pre className="whitespace-pre-wrap text-fg">{`INSERT INTO laps (...) ON DUPLICATE KEY UPDATE ...`}</pre>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <p className="mb-2 tracking-widest text-subtle uppercase">2. Procedure</p>
              <pre className="whitespace-pre-wrap text-fg">{`CALL Get_Live_Leaderboard(${sessionKey});
CALL Get_Driver_Lap_History(${sessionKey}, ${drv});`}</pre>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <p className="mb-2 tracking-widest text-subtle uppercase">3. Trigger</p>
              <pre className="whitespace-pre-wrap text-fg">{`AFTER INSERT → is_purple_s* / session_best`}</pre>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <p className="mb-2 tracking-widest text-subtle uppercase">4. Derived (live)</p>
              <pre className="whitespace-pre-wrap text-fg">{`session_key = ${sessionKey}
cars = ${board.length}  lap = ${currentLap ?? "—"}
live_rank = ${row?.live_rank ?? "—"}
gap_to_leader = ${row?.gap_to_leader != null ? "+" + Number(row.gap_to_leader).toFixed(3) : "—"}
gap_to_ahead = ${row?.gap_to_car_ahead != null ? "+" + Number(row.gap_to_car_ahead).toFixed(3) : "—"}`}</pre>
            </div>
            {isOpenF1 && sampleLap && (
              <div className={`rounded-md p-3 ${purpleFired ? "bg-sector-purple/10" : "bg-surface-2"}`}>
                <p className="mb-1 tracking-widest text-subtle uppercase">
                  Raw lap #{sampleLap.lap_number} {code}
                  {purpleFired ? " · FIRED" : ""}
                </p>
                <pre className="whitespace-pre-wrap text-fg">{`s1 ${fmtSec(sampleLap.duration_sector_1)} s2 ${fmtSec(sampleLap.duration_sector_2)} s3 ${fmtSec(sampleLap.duration_sector_3)}
lap ${fmtLap(sampleLap.lap_duration)}`}</pre>
              </div>
            )}
            {live && (
              <TracePanel sessionKey={sessionKey} elapsed={elapsed} board={board} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      className="flex-1"
    >
      {children}
    </Button>
  );
}
