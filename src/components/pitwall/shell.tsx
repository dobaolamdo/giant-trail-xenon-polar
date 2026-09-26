import { useEffect, useState } from "react";
import { usePitwall } from "@/lib/f1/store";
import { TimingHeader } from "./header";
import { pullLiveOf1 } from "@/lib/f1/live-of1";
import { Leaderboard } from "./leaderboard";
import type { LeaderboardRow } from "@/lib/f1/types";

export function PitwallShell() {
  const sessionKey = usePitwall((s) => s.sessionKey);
  const view = usePitwall((s) => s.view);
  const isLiveOf1 = sessionKey === 11377;
  const [status, setStatus] = useState("");
  const [locked, setLocked] = useState(false);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [maxLap, setMaxLap] = useState(0);

  useEffect(() => {
    if (!isLiveOf1) return;
    let cancelled = false;
    const tick = async () => {
      const r = await pullLiveOf1(sessionKey);
      if (cancelled) return;
      setLocked(r.locked);
      setStatus(r.status);
      if (r.laps && r.laps.length > 0) {
        const mx = r.maxLap ?? 0;
        setMaxLap(mx);
        const byDriver = new Map<number, number>();
        for (const l of r.laps) {
          const d = Number(l.lap_duration);
          if (!Number.isFinite(d) || d <= 0) continue;
          byDriver.set(l.driver_number, (byDriver.get(l.driver_number) ?? 0) + d);
        }
        const ordered = [...byDriver.entries()].sort((a, b) => a[1] - b[1]);
        const leaderT = ordered[0]?.[1] ?? 0;
        const meta = r.drivers ?? new Map();
        setBoard(
          ordered.map(([num, total], i) => {
            const m = meta.get(num);
            return {
              live_rank: i + 1,
              driver_number: num,
              full_name: m?.full_name ?? `#${num}`,
              team_name: m?.team_name ?? "",
              team_colour: (m?.team_colour ?? "888888").replace(/^#/, ""),
              gap_to_leader: i === 0 ? null : total - leaderT,
              gap_to_car_ahead: null,
              last_lap: null,
              status: null,
              position_change: 0,
              code: m?.code,
            };
          }),
        );
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isLiveOf1, sessionKey]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TimingHeader />
      {isLiveOf1 && (
        <div
          className={`mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs sm:mx-4 ${
            locked
              ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40"
              : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40"
          }`}
        >
          <span className={`size-1.5 rounded-full ${locked ? "bg-amber-400" : "bg-emerald-400 live-dot"}`} />
          <span className="font-mono tracking-wide">{status || "LIVE · Baku"}</span>
          <span className="ml-auto text-[10px] uppercase opacity-70">key {sessionKey} · lap {maxLap}</span>
        </div>
      )}
      {view === "timing" && (
        <div className="flex-1 px-3 py-2 sm:px-4">
          {board.length > 0 ? (
            <Leaderboard rows={board} selected={board[0]?.driver_number ?? 0} onSelect={() => {}} mode="live" />
          ) : (
            <p className="text-sm text-muted">
              {isLiveOf1
                ? locked
                  ? "OpenF1 live locked — sponsor needed during session. Data free after race ends."
                  : "Waiting for laps… Race starts ~18:00 +07."
                : "Open Archive to pick a historical session, or press Live for Baku."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
