import { useEffect, useState, type ReactNode } from "react";
import { usePitwall } from "@/lib/f1/store";
import { TimingHeader } from "./header";
import { pullLiveOf1 } from "@/lib/f1/live-of1";
import { rankFromLaps, type RankedRow } from "@/lib/f1/rank";
import { Leaderboard } from "./leaderboard";
import { ArchiveView } from "./archive";
import { SchemaView } from "./schema-view";
import type { LeaderboardRow } from "@/lib/f1/types";
import { Button } from "@/components/ui/button";

const OF1 = "https://api.openf1.org/v1";
const API =
  import.meta.env.VITE_API_URL || "https://f1-dashboard-sbrl.onrender.com";

/** Baku Race 2026 + any session opened from OpenF1 calendar. */
function isOpenF1Key(k: number) {
  return k >= 9000;
}

export function PitwallShell() {
  const sessionKey = usePitwall((s) => s.sessionKey);
  const view = usePitwall((s) => s.view);
  const setArchiveClock = usePitwall((s) => s.setArchiveClock);

  const [status, setStatus] = useState("");
  const [locked, setLocked] = useState(false);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [maxLap, setMaxLap] = useState(0);
  const [loading, setLoading] = useState(false);

  // ——— OpenF1 session (archive race / practice / Baku) ———
  useEffect(() => {
    if (view !== "timing" || !isOpenF1Key(sessionKey)) return;
    let cancelled = false;

    const applyBoard = (rows: RankedRow[]) => {
      setBoard(
        rows.map((r) => ({
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
        })),
      );
    };

    const tick = async () => {
      setLoading(true);
      try {
        // 1) Prefer live-of1 (drivers + laps + session_result → correct DNF order)
        const r = await pullLiveOf1(sessionKey);
        if (cancelled) return;
        setLocked(r.locked);
        setStatus(r.status);
        if (r.board && r.board.length > 0) {
          applyBoard(r.board);
          setMaxLap(r.maxLap ?? 0);
          setArchiveClock({
            maxLap: r.maxLap ?? 0,
            lap: r.maxLap ?? 0,
            weather: r.weather
              ? {
                  air_temperature: r.weather.air_temperature,
                  track_temperature: r.weather.track_temperature,
                  humidity: r.weather.humidity,
                  wind_speed: r.weather.wind_speed,
                  rainfall: r.weather.rainfall,
                }
              : null,
          });
          return;
        }

        // 2) Fallback: backend session-laps + rank locally
        const res = await fetch(
          `${API}/api/session-laps?session_key=${sessionKey}`,
        );
        const laps = await res.json();
        if (cancelled) return;
        if (Array.isArray(laps) && laps.length > 0) {
          const meta = r.drivers ?? new Map();
          const mx = laps.reduce(
            (a: number, l: { lap_number: number }) =>
              Math.max(a, Number(l.lap_number) || 0),
            0,
          );
          const ranked = rankFromLaps(laps, meta, { maxLap: mx });
          applyBoard(ranked);
          setMaxLap(mx);
          setStatus(`DB · ${laps.length} laps`);
          setArchiveClock({ maxLap: mx, lap: mx });
        }
      } catch {
        if (!cancelled) setStatus("Load error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    tick();
    // Poll only for “live-ish” recent keys; historical once is enough
    const poll = sessionKey >= 11300;
    const id = poll ? setInterval(tick, 8000) : undefined;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [view, sessionKey, setArchiveClock]);

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
          className={`mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs sm:mx-4 ${
            locked
              ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40"
              : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              locked ? "bg-amber-400" : "bg-emerald-400 live-dot"
            }`}
          />
          <span className="font-mono tracking-wide">
            {status || (loading ? "Loading…" : `Session ${sessionKey}`)}
          </span>
          <span className="ml-auto text-[10px] uppercase opacity-70">
            key {sessionKey} · lap {maxLap}
          </span>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col px-3 py-2 sm:px-4">
        {board.length > 0 ? (
          <Leaderboard
            rows={board}
            selected={board[0]?.driver_number ?? 0}
            onSelect={() => {}}
            mode={board.some((b) => b.points != null) ? "result" : "live"}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted">
              {locked
                ? "OpenF1 live locked during session — data free ~30 min after the flag."
                : loading
                  ? "Loading classification…"
                  : "Open Archive to pick FP1 / FP2 / FP3 / Quali / Race (incl. Baku)."}
            </p>
            <Button size="sm" variant="secondary" onClick={() => usePitwall.getState().openArchive()}>
              Open Archive
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
