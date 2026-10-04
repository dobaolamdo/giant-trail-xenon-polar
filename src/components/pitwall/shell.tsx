import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { usePitwall } from "@/lib/f1/store";
import { TimingHeader } from "./header";
import { pullLiveOf1 } from "@/lib/f1/live-of1";
import { BAKU_RACE_KEY, bakuFallbackBoard } from "@/lib/f1/baku-fallback";
import { mergeMeta, rosterMeta } from "@/lib/f1/drivers-roster";
import {
  rankFromLaps,
  type RankDriverMeta,
  type RankedRow,
} from "@/lib/f1/rank";
import { Leaderboard } from "./leaderboard";
import { ArchiveView } from "./archive";
import { SchemaView } from "./schema-view";
import { DriverDetail } from "./driver-detail";
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

export function PitwallShell() {
  const sessionKey = usePitwall((s) => s.sessionKey);
  const view = usePitwall((s) => s.view);
  const setArchiveClock = usePitwall((s) => s.setArchiveClock);

  const [status, setStatus] = useState("");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<Map<number, RankDriverMeta>>(() =>
    rosterMeta(),
  );
  const [rawLaps, setRawLaps] = useState<RawLap[]>([]);
  const [maxLap, setMaxLap] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(16);
  const [selected, setSelected] = useState(0);
  const [finalBoard, setFinalBoard] = useState<LeaderboardRow[] | null>(null);
  const [side, setSide] = useState<"driver" | "sql">("driver");

  const maxLapRef = useRef(maxLap);
  maxLapRef.current = maxLap;

  useEffect(() => {
    if (view !== "timing" || !isOpenF1Key(sessionKey)) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setPlaying(false);
      setRawLaps([]);
      setFinalBoard(null);
      setCurrentLap(1);
      setMaxLap(0);

      let m = rosterMeta();
      let laps: RawLap[] = [];
      let gotLb: LeaderboardRow[] | null = null;

      // 1) MySQL leaderboard — names + colours + final order
      try {
        const lbRes = await fetch(
          `${API}/api/leaderboard?session_key=${sessionKey}`,
        );
        if (lbRes.ok) {
          const lb = await lbRes.json();
          if (Array.isArray(lb) && lb.length > 0) {
            const fromLb = new Map<number, RankDriverMeta>();
            for (const r of lb) {
              const n = Number(r.driver_number);
              if (!n) continue;
              fromLb.set(n, {
                full_name: String(r.full_name ?? r.name_acronym ?? `#${n}`),
                team_name: String(r.team_name ?? ""),
                team_colour: colour(r.team_colour),
                code:
                  r.name_acronym != null ? String(r.name_acronym) : undefined,
              });
            }
            m = mergeMeta(m, fromLb);
            gotLb = enrichNames(
              lb.map((r: any, i: number) => ({
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
                code:
                  r.name_acronym != null ? String(r.name_acronym) : undefined,
                points: r.points != null ? Number(r.points) : undefined,
                compound: "MEDIUM" as const,
              })),
              m,
            );
          }
        }
      } catch {
        /* */
      }

      // 2) MySQL laps — for replay
      try {
        const lr = await fetch(
          `${API}/api/session-laps?session_key=${sessionKey}`,
        );
        if (lr.ok) {
          const data = await lr.json();
          if (Array.isArray(data) && data.length > 0) {
            laps = data
              .filter(
                (r: any) => r.driver_number != null && r.lap_number != null,
              )
              .map((r: any) => ({
                driver_number: Number(r.driver_number),
                lap_number: Number(r.lap_number),
                lap_duration: num(r.lap_duration),
                duration_sector_1: num(r.duration_sector_1),
                duration_sector_2: num(r.duration_sector_2),
                duration_sector_3: num(r.duration_sector_3),
              }));
          }
        }
      } catch {
        /* */
      }

      // 3) OpenF1 if still empty
      if (laps.length === 0) {
        try {
          const r = await pullLiveOf1(sessionKey);
          if (!cancelled) {
            setLocked(r.locked);
            if (r.drivers && r.drivers.size > 0) {
              m = mergeMeta(m, r.drivers);
            }
            if (r.laps && r.laps.length > 0) {
              laps = r.laps.map((l) => ({
                driver_number: l.driver_number,
                lap_number: l.lap_number,
                lap_duration: num(l.lap_duration),
                duration_sector_1: num(l.duration_sector_1),
                duration_sector_2: num(l.duration_sector_2),
                duration_sector_3: num(l.duration_sector_3),
              }));
            }
            if (r.board && r.board.length > 0 && !gotLb) {
              gotLb = enrichNames(rankedToUi(r.board), m);
            }
            if (r.status) setStatus(r.status);
          }
        } catch {
          if (!cancelled) setStatus("OpenF1 unavailable");
        }
      }

      if (
        sessionKey === BAKU_RACE_KEY &&
        laps.length === 0 &&
        (!gotLb || gotLb.length === 0)
      ) {
        gotLb = enrichNames(rankedToUi(bakuFallbackBoard()), m);
        setStatus("Baku 2026 · cached result");
      }

      if (cancelled) return;

      const mx = laps.reduce((a, l) => Math.max(a, l.lap_number), 0);
      setMeta(m);
      setRawLaps(laps);
      setMaxLap(mx);
      setFinalBoard(gotLb);
      setCurrentLap(mx > 0 ? Math.min(1, mx) : 0);
      if (mx > 0) setCurrentLap(1);

      const first =
        gotLb?.[0]?.driver_number ??
        (m.size > 0 ? [...m.keys()][0] : 0);
      if (first) setSelected(first);

      if (laps.length > 0) {
        setStatus(`Replay ready · ${laps.length} lap rows · L1→L${mx}`);
        setLocked(false);
      } else if (gotLb && gotLb.length > 0) {
        setStatus(`Result · ${gotLb.length} drivers`);
      } else {
        setStatus("No data for this session");
      }

      setArchiveClock({ maxLap: mx, lap: 1, elapsed: 0, duration: mx });
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [view, sessionKey, setArchiveClock]);

  useEffect(() => {
    if (!playing || maxLap <= 0) return;
    const ms = Math.max(80, 3200 / speed);
    const id = setInterval(() => {
      setCurrentLap((c) => {
        if (c >= maxLapRef.current) {
          setPlaying(false);
          return maxLapRef.current;
        }
        return c + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [playing, speed, maxLap]);

  useEffect(() => {
    setArchiveClock({ lap: currentLap, maxLap, elapsed: currentLap });
  }, [currentLap, maxLap, setArchiveClock]);

  const board: LeaderboardRow[] = useMemo(() => {
    if (rawLaps.length > 0 && currentLap > 0) {
      return enrichNames(
        rankedToUi(rankFromLaps(rawLaps, meta, { maxLap: currentLap })),
        meta,
      );
    }
    if (finalBoard && finalBoard.length > 0) {
      return enrichNames(finalBoard, meta);
    }
    return [];
  }, [rawLaps, meta, currentLap, finalBoard]);

  const driverRow = board.find((b) => b.driver_number === selected);
  const driverList: DriverListRow | undefined = useMemo(() => {
    const m = meta.get(selected);
    if (!m && !driverRow) return undefined;
    return {
      driver_number: selected,
      full_name: m?.full_name ?? driverRow?.full_name ?? `#${selected}`,
      team_name: m?.team_name ?? driverRow?.team_name ?? "",
      team_colour: colour(
        m?.team_colour ?? driverRow?.team_colour ?? "888888",
      ),
      name_acronym: m?.code ?? driverRow?.code,
      headshot_url: null,
    };
  }, [meta, selected, driverRow]);

  const driverLaps = useMemo(
    () =>
      rawLaps.length > 0
        ? annotatePurple(rawLaps, selected, currentLap || maxLap)
        : [],
    [rawLaps, selected, currentLap, maxLap],
  );

  const togglePlay = useCallback(() => {
    if (maxLap <= 0) return;
    if (currentLap >= maxLap) {
      setCurrentLap(1);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [maxLap, currentLap]);

  const restart = useCallback(() => {
    setCurrentLap(1);
    setPlaying(true);
  }, []);

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

  const canReplay = rawLaps.length > 0 && maxLap > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <TimingHeader />

      {isOpenF1Key(sessionKey) && (
        <div
          className={cn(
            "mx-3 mt-1 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs sm:mx-4",
            locked
              ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40"
              : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              locked ? "bg-amber-400" : "bg-emerald-400 live-dot",
            )}
          />
          <span className="font-mono tracking-wide">
            {status || (loading ? "Loading…" : `Session ${sessionKey}`)}
          </span>
          <span className="ml-auto text-[10px] uppercase opacity-70">
            key {sessionKey}
            {maxLap > 0 ? ` · L${currentLap}/${maxLap}` : ""}
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-2 sm:flex-row sm:px-4">
        {board.length > 0 ? (
          <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Leaderboard
                rows={board}
                selected={selected}
                onSelect={(n) => {
                  setSelected(n);
                  setSide("driver");
                }}
                mode={
                  !canReplay && board.some((b) => b.points != null)
                    ? "result"
                    : "live"
                }
              />
            </div>

            <div className="flex min-h-[220px] w-full flex-col overflow-hidden rounded-lg border border-border bg-surface sm:min-h-0 sm:w-[min(100%,380px)]">
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
                  variant={side === "sql" ? "secondary" : "ghost"}
                  className="flex-1"
                  onClick={() => setSide("sql")}
                >
                  SQL
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {side === "driver" && (
                  <DriverDetail
                    driver={driverList}
                    row={driverRow}
                    laps={driverLaps}
                  />
                )}
                {side === "sql" && (
                  <div className="h-full space-y-3 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-muted">
                    <div>
                      <p className="mb-1 text-xs tracking-widest text-subtle uppercase">
                        Raw ingest
                      </p>
                      <pre className="rounded bg-surface-2 p-2 text-fg">
                        {driverLaps.length > 0
                          ? JSON.stringify(
                              {
                                driver: selected,
                                lap: driverLaps[driverLaps.length - 1]
                                  ?.lap_number,
                                s1: driverLaps[driverLaps.length - 1]
                                  ?.duration_sector_1,
                                s2: driverLaps[driverLaps.length - 1]
                                  ?.duration_sector_2,
                                s3: driverLaps[driverLaps.length - 1]
                                  ?.duration_sector_3,
                              },
                              null,
                              2,
                            )
                          : "— no lap —"}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs tracking-widest text-sector-purple uppercase">
                        Trigger · purple sector
                      </p>
                      <p className="text-fg">
                        {driverLaps.some(
                          (l) =>
                            l.is_purple_s1 || l.is_purple_s2 || l.is_purple_s3,
                        )
                          ? "Session-best sector flagged (mirror of AFTER INSERT trigger)."
                          : "Play to advance — purple when sector beats session min."}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs tracking-widest text-subtle uppercase">
                        Derived · leaderboard
                      </p>
                      <pre className="rounded bg-surface-2 p-2 text-fg">
                        {`CALL Get_Live_Leaderboard(${sessionKey})\n-- rank by laps then time; DNF last`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-md text-sm text-muted">
              {loading
                ? "Loading…"
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
        <div className="sticky bottom-0 z-20 border-t border-border bg-surface px-3 py-2.5 sm:px-4">
          <div className="mb-2">
            <Slider
              min={1}
              max={Math.max(1, maxLap)}
              step={1}
              value={[Math.max(1, currentLap)]}
              onValueChange={(v) => {
                setPlaying(false);
                setCurrentLap(v[0] ?? 1);
              }}
              aria-label="Lap progress"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing && currentLap < maxLap ? (
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
              Lap {String(currentLap).padStart(2, "0")}/{maxLap}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
