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

/** Lọc session-laps theo 1 xe → bảng sector */
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
    const s1 = Number(l.duration_sector_1) || 0;
    const s2 = Number(l.duration_sector_2) || 0;
    const s3 = Number(l.duration_sector_3) || 0;
    return {
      lap_number: l.lap_number,
      lap_duration,
      duration_sector_1: s1,
      duration_sector_2: s2,
      duration_sector_3: s3,
      is_purple_s1: Boolean(l.is_purple_s1),
      is_purple_s2: Boolean(l.is_purple_s2),
      is_purple_s3: Boolean(l.is_purple_s3),
      compound: "UNKNOWN",
      is_pit_out_lap: false,
      is_personal_best: lap_duration > 0 && lap_duration <= best + 0.0005,
    };
  });
}

export function PitwallShell() {
  const elapsed = useRaceClock((s) => s.elapsed);
  const selected = useRaceClock((s) => s.selectedDriver);
  const selectDriver = useRaceClock((s) => s.selectDriver);
  const bindSession = useRaceClock((s) => s.bindSession);
  const sessionKey = usePitwall((s) => s.sessionKey);
  const view = usePitwall((s) => s.view);
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
              code:
                r.name_acronym != null ? String(r.name_acronym) : undefined,
            });
          }
          setFinishBoard(mapApiLeaderboard(boardData, true));
        } else {
          setFinishBoard(null);
        }
        setMeta(m);

        const laps: RawLap[] = Array.isArray(lapsData)
          ? lapsData.map((r: Record<string, unknown>) => ({
              driver_number: Number(r.driver_number),
              lap_number: Number(r.lap_number),
              lap_duration: r.lap_duration as number | string | null,
              duration_sector_1: r.duration_sector_1 as number | string | null,
              duration_sector_2: r.duration_sector_2 as number | string | null,
              duration_sector_3: r.duration_sector_3 as number | string | null,
              is_purple_s1: r.is_purple_s1 as number | boolean | undefined,
              is_purple_s2: r.is_purple_s2 as number | boolean | undefined,
              is_purple_s3: r.is_purple_s3 as number | boolean | undefined,
            }))
          : [];
        setRawLaps(laps);
        const mx = laps.reduce((a, l) => Math.max(a, l.lap_number), 0);
        setMaxLap(mx);
        setCurrentLap(1);
        const first = [...m.keys()][0];
        if (first != null) selectDriver(first);
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
  }, [sessionKey, isOpenF1, selectDriver]);

  // Auto play: +1 lap mỗi 0.8s
  useEffect(() => {
    if (!playing || !isOpenF1 || maxLap < 1) return;
    const id = window.setInterval(() => {
      setCurrentLap((l) => {
        if (l >= maxLap) {
          setPlaying(false);
          return maxLap;
        }
        return l + 1;
      });
    }, 800);
    return () => window.clearInterval(id);
  }, [playing, isOpenF1, maxLap]);

  const apiBoard = useMemo(() => {
    if (!isOpenF1) return null;
    if (maxLap > 0 && currentLap >= maxLap && finishBoard?.length) {
      return finishBoard;
    }
    if (rawLaps.length === 0) return finishBoard;
    return boardAtLap(rawLaps, meta, currentLap, false);
  }, [isOpenF1, maxLap, currentLap, finishBoard, rawLaps, meta]);

  const simBoard = useMemo(
    () => Get_Live_Leaderboard(sessionKey, elapsed),
    [sessionKey, elapsed],
  );
  const board = apiBoard ?? simBoard;
  const atFinish = isOpenF1 && maxLap > 0 && currentLap >= maxLap;

  const activeNumber =
    selected || board[0]?.driver_number || [...meta.keys()][0] || 0;

  const row =
    board.find((r) => r.driver_number === activeNumber) ?? board[0];

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
    if (!isOpenF1) {
      return Get_Driver_Lap_History(sessionKey, activeNumber, elapsed);
    }
    return lapsForDriver(rawLaps, activeNumber, currentLap);
  }, [isOpenF1, sessionKey, activeNumber, elapsed, rawLaps, currentLap]);

  const pits = useMemo(
    () => Get_Pit_Stops(sessionKey, elapsed),
    [sessionKey, elapsed],
  );
  const control = useMemo(
    () => Get_Race_Control_Until(sessionKey, elapsed),
    [sessionKey, elapsed],
  );

  function pick(n: number) {
    selectDriver(n);
    setTab("driver");
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setMobileOpen(true);
    }
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
      showSql={isOpenF1}
      board={board}
      sessionKey={sessionKey}
      elapsed={elapsed}
      selectedDriver={activeNumber}
    />
  );

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
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 lg:flex-row sm:px-4">
            <Leaderboard
              rows={board}
              selected={activeNumber}
              onSelect={pick}
              mode={
                atFinish
                  ? "result"
                  : apiBoard
                    ? "live"
                    : replay
                      ? "live"
                      : "result"
              }
            />
            <aside className="panel hidden min-h-0 w-96 shrink-0 flex-col overflow-hidden lg:flex">
              {side}
            </aside>
          </div>

          {isOpenF1 && maxLap > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 sm:gap-3 sm:px-4">
              <span className="text-xs tracking-widest text-muted uppercase">
                {lapsLoading
                  ? "Loading…"
                  : atFinish
                    ? `Finish · ${maxLap}`
                    : `Lap ${currentLap}/${maxLap}`}
              </span>
              <input
                type="range"
                min={1}
                max={maxLap}
                value={currentLap}
                onChange={(e) => {
                  setPlaying(false);
                  setCurrentLap(Number(e.target.value));
                }}
                className="min-w-[8rem] flex-1"
              />
              <Button
                size="sm"
                variant={playing ? "default" : "secondary"}
                onClick={() => {
                  if (currentLap >= maxLap) setCurrentLap(1);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? "Pause" : "Play"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentLap <= 1}
                onClick={() => {
                  setPlaying(false);
                  setCurrentLap((l) => Math.max(1, l - 1));
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
                  setCurrentLap((l) => Math.min(maxLap, l + 1));
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
  showSql = false,
  board,
  sessionKey,
  elapsed,
  selectedDriver,
}: {
  tab: SideTab;
  onTab: (t: SideTab) => void;
  driver: DriverListRow | undefined;
  row: LeaderboardRow | undefined;
  laps: LapHistoryRow[];
  pits: ReturnType<typeof Get_Pit_Stops>;
  control: ReturnType<typeof Get_Race_Control_Until>;
  live: boolean;
  showSql?: boolean;
  board: LeaderboardRow[];
  sessionKey: number;
  elapsed: number;
  selectedDriver?: number;
}) {
  const drv = selectedDriver ?? board[0]?.driver_number ?? 0;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 p-2">
        <TabBtn active={tab === "driver"} onClick={() => onTab("driver")}>
          Driver
        </TabBtn>
        {live && (
          <TabBtn active={tab === "control"} onClick={() => onTab("control")}>
            Control
          </TabBtn>
        )}
        {live && (
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
        {live && tab === "control" && (
          <div className="h-full overflow-y-auto">
            <RaceControlList messages={control} />
          </div>
        )}
        {live && tab === "pits" && (
          <div className="h-full overflow-y-auto">
            <PitStopTable stops={pits} />
          </div>
        )}
        {(live || showSql) && tab === "trace" && (
          <div className="h-full space-y-3 overflow-y-auto p-3 font-mono text-xs">
            <div className="rounded-md bg-surface-2 p-3">
              <p className="mb-2 tracking-widest text-subtle uppercase">
                1. Pump OpenF1 → MySQL
              </p>
              <pre className="whitespace-pre-wrap text-fg">{`INSERT INTO laps (
  session_key, driver_number, lap_number,
  lap_duration, duration_sector_1, duration_sector_2, duration_sector_3
) VALUES (?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  lap_duration = VALUES(lap_duration),
  duration_sector_1 = VALUES(duration_sector_1),
  duration_sector_2 = VALUES(duration_sector_2),
  duration_sector_3 = VALUES(duration_sector_3);`}</pre>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <p className="mb-2 tracking-widest text-subtle uppercase">
                2. Procedure (API đang gọi)
              </p>
              <pre className="whitespace-pre-wrap text-fg">{`CALL Get_Live_Leaderboard(${sessionKey});
CALL Get_Driver_Lap_History(${sessionKey}, ${drv});
-- JSON → leaderboard + driver panel`}</pre>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <p className="mb-2 tracking-widest text-subtle uppercase">
                3. Trigger (demo DBeaver)
              </p>
              <pre className="whitespace-pre-wrap text-fg">{`INSERT INTO laps (...) VALUES (...);
-- AFTER INSERT: cập nhật purple / session_best
-- Không cần UPDATE tay`}</pre>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <p className="mb-2 tracking-widest text-subtle uppercase">
                4. Derived trên UI
              </p>
              <pre className="whitespace-pre-wrap text-fg">{`session_key = ${sessionKey}
drivers on board = ${board.length}
mid-race: RANK by SUM(lap_duration) approx
Finish: procedure + Pts 25/18/15...
selected driver = ${drv}`}</pre>
            </div>
            {live && (
              <TracePanel
                sessionKey={sessionKey}
                elapsed={elapsed}
                board={board}
              />
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
