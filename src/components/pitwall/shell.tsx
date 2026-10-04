import { useEffect, useState } from "react";
import { usePitwall } from "@/lib/f1/store";
import { TimingHeader } from "./header";
import { pullLiveOf1 } from "@/lib/f1/live-of1";
import { BAKU_RACE_KEY, bakuFallbackBoard } from "@/lib/f1/baku-fallback";
import { rankFromLaps, type RankDriverMeta, type RankedRow } from "@/lib/f1/rank";
import { Leaderboard } from "./leaderboard";
import { ArchiveView } from "./archive";
import { SchemaView } from "./schema-view";
import type { LeaderboardRow } from "@/lib/f1/types";
import { Button } from "@/components/ui/button";

const API =
  import.meta.env.VITE_API_URL || "https://f1-dashboard-sbrl.onrender.com";

function isOpenF1Key(k: number) {
  return k >= 9000;
}

function colour(c: unknown): string {
  return String(c ?? "888888").replace(/^#/, "");
}

/** Map procedure / API leaderboard rows → UI rows */
function mapApiLeaderboard(rows: any[]): LeaderboardRow[] {
  return rows.map((r, i) => ({
    live_rank: Number(r.position ?? r.live_rank ?? i + 1),
    driver_number: Number(r.driver_number),
    full_name: String(r.full_name ?? r.name_acronym ?? `#${r.driver_number}`),
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
        : r.last_lap != null
          ? Number(r.last_lap)
          : null,
    status: r.dnf || r.status === "DNF" ? "DNF" : null,
    position_change: 0,
    code: r.name_acronym != null ? String(r.name_acronym) : r.code,
    points: r.points != null ? Number(r.points) : undefined,
  }));
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
  }));
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

  useEffect(() => {
    if (view !== "timing" || !isOpenF1Key(sessionKey)) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      let got = false;

      // ——— 1) MySQL via Render (ưu tiên khi OpenF1 lock) ———
      try {
        const lbRes = await fetch(
          `${API}/api/leaderboard?session_key=${sessionKey}`,
        );
        if (lbRes.ok) {
          const lb = await lbRes.json();
          if (!cancelled && Array.isArray(lb) && lb.length > 0) {
            const mapped = mapApiLeaderboard(lb);
            // Chỉ nhận board “đủ” (≥5 xe) — tránh 2–3 dòng rác
            if (mapped.length >= 5) {
              setBoard(mapped);
              const mx = Math.max(
                0,
                ...lb.map((r: any) => Number(r.lap_number) || 0),
              );
              setMaxLap(mx);
              setStatus(`MySQL · ${mapped.length} drivers`);
              setLocked(false);
              setArchiveClock({ maxLap: mx || mapped.length, lap: mx || 1 });
              got = true;
            }
          }
        }
      } catch {
        /* continue */
      }

      // ——— 2) session-laps + rank (kèm tên từ leaderboard nếu có) ———
      if (!got) {
        try {
          const [lapsRes, lbRes] = await Promise.all([
            fetch(`${API}/api/session-laps?session_key=${sessionKey}`),
            fetch(`${API}/api/leaderboard?session_key=${sessionKey}`),
          ]);
          const laps = lapsRes.ok ? await lapsRes.json() : [];
          const lb = lbRes.ok ? await lbRes.json() : [];
          if (!cancelled && Array.isArray(laps) && laps.length > 0) {
            const meta = new Map<number, RankDriverMeta>();
            if (Array.isArray(lb)) {
              for (const r of lb) {
                const n = Number(r.driver_number);
                if (!n) continue;
                meta.set(n, {
                  full_name: String(
                    r.full_name ?? r.name_acronym ?? `#${n}`,
                  ),
                  team_name: String(r.team_name ?? ""),
                  team_colour: colour(r.team_colour),
                  code:
                    r.name_acronym != null ? String(r.name_acronym) : undefined,
                });
              }
            }
            const mx = laps.reduce(
              (a: number, l: { lap_number: number }) =>
                Math.max(a, Number(l.lap_number) || 0),
              0,
            );
            const ranked = rankFromLaps(laps, meta, { maxLap: mx });
            if (ranked.length > 0) {
              setBoard(rankedToUi(ranked));
              setMaxLap(mx);
              setStatus(`MySQL laps · ${laps.length} rows · lap ${mx}`);
              setLocked(false);
              setArchiveClock({ maxLap: mx, lap: mx });
              got = true;
            }
          }
        } catch {
          /* continue */
        }
      }

      // ——— 3) OpenF1 (khi không bị lock) ———
      if (!got) {
        try {
          const r = await pullLiveOf1(sessionKey);
          if (cancelled) return;
          setLocked(r.locked);
          if (r.board && r.board.length > 0) {
            setBoard(rankedToUi(r.board));
            setMaxLap(r.maxLap ?? 0);
            setStatus(r.status);
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
            got = true;
          } else if (!got) {
            setStatus(r.status);
          }
        } catch {
          if (!cancelled) setStatus("OpenF1 error");
        }
      }

      // ——— 4) Baku offline cache ———
      if (!got && sessionKey === BAKU_RACE_KEY) {
        const fb = bakuFallbackBoard();
        setBoard(rankedToUi(fb));
        setMaxLap(51);
        setStatus("Baku 2026 · cached official result");
        setLocked(false);
        setArchiveClock({ maxLap: 51, lap: 51 });
        got = true;
      }

      if (!got && !cancelled) {
        setBoard([]);
        setStatus(
          "No data — OpenF1 may be locked; pump this session to MySQL or wait",
        );
      }
      if (!cancelled) setLoading(false);
    };

    load();
    // Chỉ poll session “mới” (2026+); archive historical load 1 lần
    const poll = sessionKey >= 11300;
    const id = poll ? setInterval(load, 12000) : undefined;
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
            <p className="max-w-md text-sm text-muted">
              {loading
                ? "Loading classification…"
                : locked
                  ? "OpenF1 đang khóa vì có session live. Chặng đã pump vào MySQL vẫn xem được từ Archive."
                  : "Chưa có data cho session này. Vào Archive chọn chặng 2024 đã pump, hoặc Live (Baku cache)."}
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
    </div>
  );
}
