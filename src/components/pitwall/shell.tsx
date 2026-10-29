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
import { LiveCountdownBanner } from "./live-countdown";
import { ArchiveView } from "./archive";
import { SchemaView } from "./schema-view";
import { DriverDetail } from "./driver-detail";
import { SqlPanel } from "./sql-panel";
import { StintPitPanel } from "./stint-pit-panel";
import { TelemetryComparePanel } from "./telemetry-compare";
import { TrackMapPanel } from "./track-map";
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

const SPEEDS = [1, 2, 4, 8, 16] as const;
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

function computeDriverLiveLap(
  laps: RawLap[],
  driverNumber: number,
  elapsedSec: number,
  is2026: boolean,
  sessionBests: { minS1: number; minS2: number; minS3: number },
  driverRank: number = 1
) {
  const driverLaps = laps
    .filter((l) => l.driver_number === driverNumber && num(l.lap_duration) != null && num(l.lap_duration)! > 0)
    .sort((a, b) => a.lap_number - b.lap_number);

  // Staggered grid slot offset (P1 is at 0.995, P2 at 0.989, P3 at 0.983, etc., behind start line)
  const gridFraction = (1.0 - (driverRank - 1) * 0.006) % 1.0;

  // 1. GRID STANDING / LIGHTS COUNTDOWN (elapsedSec <= 3.0s):
  // All cars are stationary on the grid, holding clutch & revs at 11,200 RPM
  if (elapsedSec <= 3.0) {
    return {
      s1: null,
      s2: null,
      s3: null,
      s1_state: "pending" as const,
      s2_state: "pending" as const,
      s3_state: "pending" as const,
      speed: 0,
      gear: 1 as const,
      rpm: 11200 + Math.round(Math.sin(driverNumber * 3) * 250),
      throttle: 100,
      brake: 100,
      drs: 0,
      overtake_mode: is2026 ? false : undefined,
      battery_soc: is2026 ? 100 : undefined,
      deployment_kw: is2026 ? 0 : undefined,
      is_clipping: is2026 ? false : undefined,
      aero_mode: is2026 ? ("Z-MODE" as const) : undefined,
      lap_fraction: gridFraction,
    };
  }

  // 2. RACE LAUNCH OFF THE LINE (3.0s < elapsedSec < 7.5s):
  // Green flag / Lights out! Accelerate from 0 -> 215 km/h with realistic F1 launch curve
  if (elapsedSec < 7.5) {
    const launchT = elapsedSec - 3.0; // 0s to 4.5s
    const reactionDelay = 0.15 + (driverRank - 1) * 0.035;
    const accelT = Math.max(0, launchT - reactionDelay);

    const speed = Math.round(Math.min(215, accelT * 48));
    const gear = speed === 0 ? 1 : speed < 65 ? 1 : speed < 115 ? 2 : speed < 165 ? 3 : 4;
    const rpm = speed === 0 ? 11200 : Math.round(8600 + (speed % 50) * 65);

    // Realistic roll-off forward from grid slot
    const launchDistFrac = accelT * accelT * 0.0012;
    const lap_fraction = (gridFraction + launchDistFrac) % 1.0;

    return {
      s1: Math.max(0, elapsedSec - 3.0),
      s2: null,
      s3: null,
      s1_state: "active" as const,
      s2_state: "pending" as const,
      s3_state: "pending" as const,
      speed,
      gear,
      rpm,
      throttle: 100,
      brake: 0,
      drs: 0,
      overtake_mode: is2026 ? false : undefined,
      battery_soc: is2026 ? Math.round(100 - accelT * 2.5) : undefined,
      deployment_kw: is2026 ? 350 : undefined,
      is_clipping: is2026 ? false : undefined,
      aero_mode: is2026 ? ("Z-MODE" as const) : undefined,
      lap_fraction,
    };
  }

  // 3. RACING ON TRACK (FLYING LAP):
  let cum = 0;
  let activeLap: RawLap = driverLaps[0] || ({} as RawLap);
  let inLapSec = elapsedSec - 3.0;
  let driverPbS1 = Infinity;
  let driverPbS2 = Infinity;
  let driverPbS3 = Infinity;

  for (const l of driverLaps) {
    const dur = num(l.lap_duration) || 90;
    if (cum + dur <= (elapsedSec - 3.0)) {
      cum += dur;
      if (num(l.duration_sector_1) && num(l.duration_sector_1)! < driverPbS1) driverPbS1 = num(l.duration_sector_1)!;
      if (num(l.duration_sector_2) && num(l.duration_sector_2)! < driverPbS2) driverPbS2 = num(l.duration_sector_2)!;
      if (num(l.duration_sector_3) && num(l.duration_sector_3)! < driverPbS3) driverPbS3 = num(l.duration_sector_3)!;
    } else {
      activeLap = l;
      inLapSec = Math.max(0, (elapsedSec - 3.0) - cum);
      break;
    }
  }

  // Realistic fallback if driverLaps has no timing
  if (driverLaps.length === 0) {
    inLapSec = Math.max(0, elapsedSec - 3.0 + (driverRank - 1) * 0.5);
  }

  const s1Target = num(activeLap?.duration_sector_1) || 30.5;
  const s2Target = num(activeLap?.duration_sector_2) || 38.0;
  const s3Target = num(activeLap?.duration_sector_3) || 25.5;
  const lapTotal = s1Target + s2Target + s3Target || 94.0;

  let s1: number | null = null;
  let s2: number | null = null;
  let s3: number | null = null;
  let s1_state: "active" | "done" | "pb" | "purple" | "pending" = "pending";
  let s2_state: "active" | "done" | "pb" | "purple" | "pending" = "pending";
  let s3_state: "active" | "done" | "pb" | "purple" | "pending" = "pending";

  if (inLapSec < s1Target) {
    s1 = inLapSec;
    s1_state = "active";
  } else if (inLapSec < s1Target + s2Target) {
    s1 = s1Target;
    s1_state = s1Target <= sessionBests.minS1 ? "purple" : s1Target <= driverPbS1 ? "pb" : "done";
    s2 = inLapSec - s1Target;
    s2_state = "active";
  } else {
    s1 = s1Target;
    s1_state = s1Target <= sessionBests.minS1 ? "purple" : s1Target <= driverPbS1 ? "pb" : "done";
    s2 = s2Target;
    s2_state = s2Target <= sessionBests.minS2 ? "purple" : s2Target <= driverPbS2 ? "pb" : "done";
    if (inLapSec < lapTotal) {
      s3 = inLapSec - (s1Target + s2Target);
      s3_state = "active";
    } else {
      s3 = s3Target;
      s3_state = s3Target <= sessionBests.minS3 ? "purple" : s3Target <= driverPbS3 ? "pb" : "done";
    }
  }

  // Lap fraction [0, 1] determines exact track position
  const lapFrac = lapTotal > 0 ? (inLapSec % lapTotal) / lapTotal : 0;

  // Track layout zones:
  // Straights: 0.25 - 0.42 (Back straight) and 0.92 - 0.10 (Pit straight)
  const isMainStraight = (lapFrac >= 0.25 && lapFrac <= 0.42) || (lapFrac >= 0.92 || lapFrac <= 0.10);
  // Heavy Braking zones: into Turn 1 (0.10 - 0.16) and Turn 7 (0.42 - 0.48)
  const isHeavyBraking = (lapFrac > 0.10 && lapFrac < 0.16) || (lapFrac > 0.42 && lapFrac < 0.48);

  let speed = 210;
  let gear: number | string = 5;
  let rpm = 10500;
  let throttle = 85;
  let brake = 0;
  let drs = 0;
  let overtake_mode = false;
  let battery_soc: number | undefined = undefined;
  let deployment_kw: number | undefined = undefined;
  let is_clipping: boolean | undefined = undefined;
  let aero_mode: ("X-MODE" | "Z-MODE") | undefined = undefined;

  if (isMainStraight) {
    const straightProgress = (lapFrac >= 0.25 && lapFrac <= 0.42)
      ? (lapFrac - 0.25) / 0.17
      : lapFrac >= 0.92
        ? (lapFrac - 0.92) / 0.18
        : (lapFrac + 0.08) / 0.18;

    speed = Math.round(230 + straightProgress * 105 + (driverNumber === 1 ? 5 : 0));
    gear = speed > 290 ? 8 : speed > 255 ? 7 : 6;
    rpm = Math.round(10800 + (speed % 30) * 45);
    throttle = 100;
    brake = 0;

    if (is2026) {
      aero_mode = speed > 260 ? "X-MODE" : "Z-MODE";
      const calcBattery = Math.max(10, Math.round(88 - straightProgress * 74));
      battery_soc = calcBattery;

      // SUPER CLIPPING DETECTION:
      // Battery depleted below 16% on high speed straight (>310 km/h) -> MGU-K drops to 0 kW, speed de-rates
      if (straightProgress > 0.78 && calcBattery <= 16 && speed > 310) {
        is_clipping = true;
        deployment_kw = 0;
        speed = Math.round(318 + Math.sin(elapsedSec * 2) * 2);
        rpm = 10900;
      } else {
        is_clipping = false;
        deployment_kw = 350;
        overtake_mode = straightProgress > 0.35 && (driverRank <= 4 || driverNumber === 4 || driverNumber === 1);
      }
    } else {
      drs = straightProgress > 0.2 ? 1 : 0;
    }
  } else if (isHeavyBraking) {
    const brakeProgress = (lapFrac > 0.10 && lapFrac < 0.16) ? (lapFrac - 0.10) / 0.06 : (lapFrac - 0.42) / 0.06;
    speed = Math.max(82, Math.round(320 - brakeProgress * 230));
    gear = speed < 95 ? 2 : speed < 140 ? 3 : speed < 190 ? 4 : speed < 240 ? 5 : 6;
    rpm = Math.round(9200 + (speed % 40) * 50);
    throttle = 0;
    brake = Math.round(85 + (1 - brakeProgress) * 15);

    if (is2026) {
      aero_mode = "Z-MODE";
      deployment_kw = -350; // 350kW Regen harvest
      battery_soc = Math.min(95, Math.round(20 + brakeProgress * 65));
      is_clipping = false;
      overtake_mode = false;
    }
  } else {
    // Corners / Technical sections
    const cornerWave = Math.sin(lapFrac * Math.PI * 12);
    speed = Math.round(135 + cornerWave * 55 + (driverNumber === 1 ? 6 : 0));
    gear = speed < 110 ? 2 : speed < 155 ? 3 : speed < 195 ? 4 : 5;
    rpm = Math.round(9400 + Math.abs(cornerWave) * 1800);
    throttle = Math.round(40 + Math.max(0, cornerWave) * 55);
    brake = cornerWave < -0.6 ? 40 : 0;

    if (is2026) {
      aero_mode = "Z-MODE";
      deployment_kw = throttle > 60 ? 180 : 60;
      battery_soc = Math.round(55 + Math.sin(lapFrac * 6) * 15);
      is_clipping = false;
      overtake_mode = false;
    }
  }

  return {
    s1,
    s2,
    s3,
    s1_state,
    s2_state,
    s3_state,
    speed,
    gear,
    rpm,
    throttle,
    brake,
    drs,
    overtake_mode: is2026 ? overtake_mode : undefined,
    battery_soc: is2026 ? battery_soc : undefined,
    deployment_kw: is2026 ? deployment_kw : undefined,
    is_clipping: is2026 ? is_clipping : undefined,
    aero_mode: is2026 ? aero_mode : undefined,
    lap_fraction: lapFrac,
  };
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
  const [speed, setSpeed] = useState<Speed>(1);
  const [selected, setSelected] = useState(1);
  const [finalBoard, setFinalBoard] = useState<LeaderboardRow[] | null>(null);
  const [side, setSide] = useState<"driver" | "stints" | "sql" | "telemetry" | "track">("driver");
  const [stints, setStints] = useState<Stint[]>([]);
  const [pits, setPits] = useState<Pit[]>([]);
  const [sessionMeta, setSessionMeta] = useState<{
    meeting_name?: string;
    circuit_short_name?: string;
    country_name?: string;
    year?: number;
  } | null>(null);
  const [weatherData, setWeatherData] = useState<{
    air_temperature?: number;
    track_temperature?: number;
    humidity?: number;
    wind_speed?: number;
    rainfall?: number;
  } | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [sideWidth, setSideWidth] = useState<number>(440);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX - 24;
      const clamped = Math.max(320, Math.min(window.innerWidth * 0.72, newWidth));
      setSideWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const maxLapRef = useRef(0);
  maxLapRef.current = maxLap;
  const durationRef = useRef(0);
  durationRef.current = durationSec;
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsedSec;
  const speedRef = useRef<Speed>(1);
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

      // Resolve Session & Circuit Metadata
      if (sessionKey === BAKU_RACE_KEY) {
        setSessionMeta({
          meeting_name: "Azerbaijan Grand Prix",
          circuit_short_name: "Baku City Circuit",
          country_name: "Azerbaijan",
          year: 2026,
        });
      } else if (sessionKey === 9606) {
        setSessionMeta({
          meeting_name: "Singapore Grand Prix",
          circuit_short_name: "Marina Bay",
          country_name: "Singapore",
          year: 2024,
        });
      } else {
        fetchJson(`https://api.openf1.org/v1/sessions?session_key=${sessionKey}`, 5000)
          .then((data: any) => {
            if (Array.isArray(data) && data[0]) {
              const s = data[0];
              setSessionMeta({
                meeting_name: s.meeting_name || s.circuit_short_name || `Session ${sessionKey}`,
                circuit_short_name: s.circuit_short_name || "",
                country_name: s.country_name || "",
                year: s.year || 2024,
              });
            }
          })
          .catch(() => {});
      }

      // Fetch Weather for this session
      fetchJson(`https://api.openf1.org/v1/weather?session_key=${sessionKey}`, 5000)
        .then((data: any) => {
          if (Array.isArray(data) && data.length > 0) {
            const w = data[data.length - 1];
            setWeatherData({
              air_temperature: num(w.air_temperature) ?? 28.5,
              track_temperature: num(w.track_temperature) ?? 34.0,
              humidity: num(w.humidity) ?? 72,
              wind_speed: num(w.wind_speed) ?? 6.5,
              rainfall: num(w.rainfall) ?? 0,
            });
          }
        })
        .catch(() => {});

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

  const sessionBests = useMemo(() => {
    let minS1 = Infinity;
    let minS2 = Infinity;
    let minS3 = Infinity;
    for (const l of rawLaps) {
      const s1 = num(l.duration_sector_1);
      const s2 = num(l.duration_sector_2);
      const s3 = num(l.duration_sector_3);
      if (s1 && s1 > 10 && s1 < minS1) minS1 = s1;
      if (s2 && s2 > 10 && s2 < minS2) minS2 = s2;
      if (s3 && s3 > 10 && s3 < minS3) minS3 = s3;
    }
    return {
      minS1: minS1 === Infinity ? 30.2 : minS1,
      minS2: minS2 === Infinity ? 38.1 : minS2,
      minS3: minS3 === Infinity ? 25.8 : minS3,
    };
  }, [rawLaps]);

  const is2026 = sessionKey >= 11300 || sessionMeta?.year === 2026;

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
    const withTyres = applyTyreAndPit(rows, stints, pits, lapForTyre);

    // Dynamically compute live sector progress and 2026 MOM / Battery / Clipping
    return withTyres.map((r) => {
      const liveData = computeDriverLiveLap(rawLaps, r.driver_number, elapsedSec, is2026, sessionBests, r.live_rank);
      return {
        ...r,
        ...liveData,
      };
    });
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
    is2026,
    sessionBests,
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

      <div className="mx-3 mt-1 sm:mx-4">
        {showCountdown ? (
          <div className="relative">
            <LiveCountdownBanner />
            <button
              onClick={() => setShowCountdown(false)}
              className="absolute top-2 right-2 z-20 text-[11px] text-muted hover:text-fg bg-surface/90 hover:bg-surface-2 rounded-md px-2 py-0.5 border border-border transition-colors"
            >
              ✕ Thu nhỏ
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-surface border border-border/80 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-semibold text-fg">Chặng Tiếp Theo: F1 2026</span>
              <span className="text-muted truncate hidden sm:inline">
                · Múi giờ của bạn: <b className="text-cyan-400 font-mono">{Intl.DateTimeFormat().resolvedOptions().timeZone}</b>
              </span>
            </div>
            <button
              onClick={() => setShowCountdown(true)}
              className="shrink-0 font-mono text-[11px] text-red-400 hover:text-red-300 font-medium underline flex items-center gap-1"
            >
              <span>Đếm ngược chặng 2026</span>
              <span>▾</span>
            </button>
          </div>
        )}
      </div>

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
                circuitInfo={{
                  name: sessionMeta?.meeting_name,
                  country:
                    sessionMeta?.country_name ||
                    (sessionKey === 11377
                      ? "Azerbaijan"
                      : sessionKey === 9606
                        ? "Singapore"
                        : undefined),
                  year:
                    sessionMeta?.year ||
                    (sessionKey >= 11300 ? 2026 : 2024),
                  session_name: "Race",
                }}
                weather={
                  weatherData || {
                    air_temperature: 29.5,
                    track_temperature: 34.2,
                    humidity: 75,
                    wind_speed: 6.8,
                    rainfall: 0,
                  }
                }
                trackStatus="Track Clear"
                elapsedSec={elapsedSec}
              />
            </div>

            {/* Drag Handle to Resize Panel */}
            <div
              onMouseDown={startResizing}
              className={cn(
                "hidden lg:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center rounded transition-colors group select-none",
                isDragging ? "bg-red-500/40" : "hover:bg-red-500/25 active:bg-red-500/40"
              )}
              title="Kéo sang trái / phải để điều chỉnh kích thước"
            >
              <div
                className={cn(
                  "h-10 w-1 rounded-full transition-colors",
                  isDragging ? "bg-red-500" : "bg-border group-hover:bg-red-400"
                )}
              />
            </div>

            <div
              style={{ width: isMaximized ? "60vw" : `${sideWidth}px` }}
              className={cn(
                "flex h-[min(45vh,400px)] w-full shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[width] duration-75 lg:h-auto lg:min-h-0",
                isDragging && "select-none transition-none"
              )}
            >
              <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
                <Button
                  size="sm"
                  variant={side === "driver" ? "secondary" : "ghost"}
                  className="flex-1 text-xs"
                  onClick={() => setSide("driver")}
                >
                  Driver
                </Button>
                <Button
                  size="sm"
                  variant={side === "stints" ? "secondary" : "ghost"}
                  className="flex-1 text-xs"
                  onClick={() => setSide("stints")}
                >
                  Stints
                </Button>
                <Button
                  size="sm"
                  variant={side === "sql" ? "secondary" : "ghost"}
                  className="flex-1 text-xs"
                  onClick={() => setSide("sql")}
                >
                  SQL
                </Button>
                <Button
                  size="sm"
                  variant={side === "telemetry" ? "secondary" : "ghost"}
                  className="flex-1 text-xs font-semibold text-emerald-400"
                  onClick={() => setSide("telemetry")}
                >
                  Telemetry
                </Button>
                <Button
                  size="sm"
                  variant={side === "track" ? "secondary" : "ghost"}
                  className="flex-1 text-xs font-semibold text-cyan-400"
                  onClick={() => setSide("track")}
                >
                  Track Map
                </Button>

                {/* Quick Maximize / Restore Toggle */}
                <Button
                  size="sm"
                  variant="outline"
                  className="hidden lg:flex h-7 px-2 text-[11px] font-mono text-muted hover:text-fg ml-1 border-border/80"
                  onClick={() => setIsMaximized((prev) => !prev)}
                  title={isMaximized ? "Thu nhỏ về kích thước chuẩn" : "Mở rộng 60% màn hình"}
                >
                  {isMaximized ? "⤡ 440px" : "⤢ Rộng 60%"}
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {side === "driver" ? (
                  <DriverDetail
                    driver={driverList}
                    row={driverRow}
                    laps={driverLaps}
                    is2026={is2026}
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
                ) : side === "sql" ? (
                  <SqlPanel
                    sessionKey={sessionKey}
                    selected={selected}
                    currentLap={currentLap}
                    maxLap={maxLap}
                    driverLaps={driverLaps}
                    board={board}
                    canReplay={canReplay}
                  />
                ) : side === "telemetry" ? (
                  <TelemetryComparePanel
                    sessionKey={sessionKey}
                    board={board}
                    initialD1={selected || 1}
                    initialD2={4}
                    masterPlaying={playing}
                    masterElapsed={elapsedSec}
                    onSelectDriver={(num) => setSelected(num)}
                  />
                ) : (
                  <TrackMapPanel
                    sessionKey={sessionKey}
                    masterPlaying={playing}
                    masterElapsed={elapsedSec}
                    board={board}
                    selectedDriver={selected}
                    onSelectDriver={(num) => setSelected(num)}
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
