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
import type { LeaderboardRow } from "@/lib/f1/types";
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
};

type DriverMeta = {
  full_name: string;
  team_name: string;
  team_colour: string;
  code?: string;
};

function boardAtLap(
  laps: RawLap[],
  meta: Map<number, DriverMeta>,
  upToLap: number,
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
    return {
      live_rank: i + 1,
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
  const [maxLap, setMaxLap] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [lapsLoading, setLapsLoading] = useState(false);

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
      setMaxLap(0);
      return;
    }
    const base =
      import.meta.env.VITE_API_URL || "https://f1-dashboard-sbrl.onrender.com";
    let cancelled = false;
    setLapsLoading(true);
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
        }
        setMeta(m);

        const laps: RawLap[] = Array.isArray(lapsData)
          ? lapsData.map((r: Record<string, unknown>) => ({
              driver_number: Number(r.driver_number),
              lap_number: Number(r.lap_number),
              lap_duration: r.lap_duration as number | string | null,
            }))
          : [];
        setRawLaps(laps);
        const mx = laps.reduce((a, l) => Math.max(a, l.lap_number), 0);
        setMaxLap(mx);
        setCurrentLap(mx > 0 ? mx : 1);
        const first = [...m.keys()][0];
        if (first != null) selectDriver(first);
      } catch {
        if (!cancelled) {
          setRawLaps([]);
          setMeta(new Map());
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

  const apiBoard = useMemo(() => {
    if (!isOpenF1 || rawLaps.length === 0) return null;
    return boardAtLap(rawLaps, meta, currentLap);
  }, [isOpenF1, rawLaps, meta, currentLap]);

  const simBoard = useMemo(
    () => Get_Live_Leaderboard(sessionKey, elapsed),
    [sessionKey, elapsed],
  );
  const board = apiBoard ?? simBoard;

  const drivers = useMemo(() => Get_Driver_List(sessionKey), [sessionKey]);
  const driver =
    drivers.find((d) => d.driver_number === selected) ?? drivers[0];
  const row = board.find((r) => r.driver_number === selected) ?? board[0];
  const laps = useMemo(
    () => Get_Driver_Lap_History(sessionKey, selected, elapsed),
    [sessionKey, selected, elapsed],
  );
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
      driver={driver}
      row={row}
      laps={laps}
      pits={pits}
      control={control}
      live={replay}
      board={board}
      sessionKey={sessionKey}
      elapsed={elapsed}
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
              selected={selected}
              onSelect={pick}
              mode={apiBoard ? "live" : replay ? "live" : "result"}
            />
            <aside className="panel hidden min-h-0 w-96 shrink-0 flex-col overflow-hidden lg:flex">
              {side}
            </aside>
          </div>

          {isOpenF1 && maxLap > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2 sm:px-4">
              <span className="text-xs tracking-widest text-muted uppercase">
                {lapsLoading
                  ? "Loading laps…"
                  : `Lap ${currentLap} / ${maxLap}`}
              </span>
              <input
                type="range"
                min={1}
                max={maxLap}
                value={currentLap}
                onChange={(e) => setCurrentLap(Number(e.target.value))}
                className="min-w-[12rem] flex-1"
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={currentLap <= 1}
                onClick={() => setCurrentLap((l) => Math.max(1, l - 1))}
              >
                − Lap
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentLap >= maxLap}
                onClick={() => setCurrentLap((l) => Math.min(maxLap, l + 1))}
              >
                + Lap
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => setCurrentLap(maxLap)}
              >
                Finish
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
            <SheetDescription>
              Lap history, race control and pit stops.
            </SheetDescription>
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
  board,
  sessionKey,
  elapsed,
}: {
  tab: SideTab;
  onTab: (t: SideTab) => void;
  driver: ReturnType<typeof Get_Driver_List>[number] | undefined;
  row: ReturnType<typeof Get_Live_Leaderboard>[number] | undefined;
  laps: ReturnType<typeof Get_Driver_Lap_History>;
  pits: ReturnType<typeof Get_Pit_Stops>;
  control: ReturnType<typeof Get_Race_Control_Until>;
  live: boolean;
  board: LeaderboardRow[];
  sessionKey: number;
  elapsed: number;
}) {
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
        {live && (
          <TabBtn active={tab === "trace"} onClick={() => onTab("trace")}>
            Trace
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
        {live && tab === "trace" && (
          <TracePanel sessionKey={sessionKey} elapsed={elapsed} board={board} />
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
