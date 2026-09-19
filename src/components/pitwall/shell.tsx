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
  const [apiBoard, setApiBoard] = useState<LeaderboardRow[] | null>(null);

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

  // Mọi session OpenF1 đã pump (key >= 9000), không chỉ 9472
  useEffect(() => {
    if (sessionKey < 9000) {
      setApiBoard(null);
      return;
    }
    const base =
      import.meta.env.VITE_API_URL || "https://f1-dashboard-sbrl.onrender.com";
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${base}/api/leaderboard?session_key=${sessionKey}`,
        );
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const rows: LeaderboardRow[] = data.map((r: Record<string, unknown>) => ({
          live_rank: Number(r.position ?? 0),
          driver_number: Number(r.driver_number),
          full_name: String(r.full_name ?? ""),
          team_name: String(r.team_name ?? ""),
          team_colour: String(r.team_colour ?? "888888").replace(/^#/, ""),
          gap_to_leader: null,
          gap_to_car_ahead: null,
          compound: undefined,
          last_lap: r.lap_duration != null ? Number(r.lap_duration) : null,
          status: null,
          position_change: 0,
          code: r.name_acronym != null ? String(r.name_acronym) : undefined,
        }));
        setApiBoard(rows);
      } catch {
        if (!cancelled) setApiBoard(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const simBoard = useMemo(
    () => Get_Live_Leaderboard(sessionKey, elapsed),
    [sessionKey, elapsed],
  );
  const board = apiBoard ?? simBoard;

  const drivers = useMemo(() => Get_Driver_List(sessionKey), [sessionKey]);
  const driver = drivers.find((d) => d.driver_number === selected) ?? drivers[0];
  const row = board.find((r) => r.driver_number === selected) ?? board[0];
  const laps = useMemo(
    () => Get_Driver_Lap_History(sessionKey, selected, elapsed),
    [sessionKey, selected, elapsed],
  );
  const pits = useMemo(() => Get_Pit_Stops(sessionKey, elapsed), [sessionKey, elapsed]);
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
              mode={apiBoard ? "result" : replay ? "live" : "result"}
            />
            <aside className="panel hidden min-h-0 w-96 shrink-0 flex-col overflow-hidden lg:flex">
              {side}
            </aside>
          </div>
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
