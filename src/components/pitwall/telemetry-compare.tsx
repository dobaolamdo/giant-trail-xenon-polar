import { useEffect, useState, useMemo, useRef } from "react";
import { Activity, Gauge, Zap, Database, RefreshCw, Play, Pause, RotateCcw, Sliders, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CockpitGauge } from "./cockpit-gauge";
import type { LeaderboardRow } from "@/lib/f1/types";

type TelemetryPoint = {
  date: string;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: number;
};

const DRIVER_INFO: Record<number, { name: string; fullName: string; team: string; color: string }> = {
  1: { name: "VER", fullName: "Max Verstappen", team: "Red Bull Racing", color: "#3671c6" },
  4: { name: "NOR", fullName: "Lando Norris", team: "McLaren", color: "#ff8000" },
  16: { name: "LEC", fullName: "Charles Leclerc", team: "Ferrari", color: "#e8002d" },
  44: { name: "HAM", fullName: "Lewis Hamilton", team: "Mercedes-AMG", color: "#27f4d2" },
  81: { name: "PIA", fullName: "Oscar Piastri", team: "McLaren", color: "#ff8000" },
  63: { name: "RUS", fullName: "George Russell", team: "Mercedes-AMG", color: "#27f4d2" },
  55: { name: "SAI", fullName: "Carlos Sainz", team: "Ferrari", color: "#e8002d" },
  11: { name: "PER", fullName: "Sergio Perez", team: "Red Bull Racing", color: "#3671c6" },
  14: { name: "ALO", fullName: "Fernando Alonso", team: "Aston Martin", color: "#229971" },
};

export function TelemetryComparePanel({
  sessionKey: initialSessionKey = 9606,
  initialD1 = 1,
  initialD2 = 4,
  masterPlaying = false,
  masterElapsed = 0,
  board,
  onSelectDriver,
}: {
  sessionKey?: number;
  initialD1?: number;
  initialD2?: number;
  masterPlaying?: boolean;
  masterElapsed?: number;
  board?: LeaderboardRow[];
  onSelectDriver?: (driverNumber: number) => void;
}) {
  const [viewMode, setViewMode] = useState<"cockpit" | "waveform">("cockpit");
  const [selectedSession, setSelectedSession] = useState(initialSessionKey);
  const [d1, setD1] = useState(initialD1);
  const [d2, setD2] = useState(initialD2);
  const [d1Data, setD1Data] = useState<TelemetryPoint[]>([]);
  const [d2Data, setD2Data] = useState<TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Sync selectedSession when active session changes from top header or archive
  useEffect(() => {
    if (initialSessionKey) {
      setSelectedSession(initialSessionKey);
    }
  }, [initialSessionKey]);

  // Sync driver when user selects driver on Leaderboard
  useEffect(() => {
    if (initialD1) {
      setD1(initialD1);
    }
  }, [initialD1]);

  // Build dynamic driver list from current session's board
  const driversList = useMemo(() => {
    if (board && board.length > 0) {
      return board.map((b) => ({
        number: b.driver_number,
        name: b.code || (b.full_name ? b.full_name.split(" ").slice(-1)[0].toUpperCase() : `#${b.driver_number}`),
        fullName: b.full_name || `#${b.driver_number}`,
        team: b.team_name || "F1 Team",
        color: b.team_colour ? (b.team_colour.startsWith("#") ? b.team_colour : `#${b.team_colour}`) : "#3671c6",
      }));
    }
    return [
      { number: 1, name: "VER", fullName: "Max Verstappen", team: "Red Bull Racing", color: "#3671c6" },
      { number: 4, name: "NOR", fullName: "Lando Norris", team: "McLaren", color: "#ff8000" },
      { number: 16, name: "LEC", fullName: "Charles Leclerc", team: "Ferrari", color: "#e8002d" },
      { number: 44, name: "HAM", fullName: "Lewis Hamilton", team: "Mercedes-AMG", color: "#27f4d2" },
      { number: 81, name: "PIA", fullName: "Oscar Piastri", team: "McLaren", color: "#ff8000" },
      { number: 63, name: "RUS", fullName: "George Russell", team: "Mercedes-AMG", color: "#27f4d2" },
      { number: 55, name: "SAI", fullName: "Carlos Sainz", team: "Ferrari", color: "#e8002d" },
      { number: 11, name: "PER", fullName: "Sergio Perez", team: "Red Bull Racing", color: "#3671c6" },
      { number: 14, name: "ALO", fullName: "Fernando Alonso", team: "Aston Martin", color: "#229971" },
      { number: 23, name: "ALB", fullName: "Alexander Albon", team: "Williams", color: "#64c4ff" },
      { number: 22, name: "TSU", fullName: "Yuki Tsunoda", team: "RB", color: "#6692ff" },
      { number: 27, name: "HUL", fullName: "Nico Hulkenberg", team: "Haas", color: "#b6babd" },
      { number: 31, name: "OCO", fullName: "Esteban Ocon", team: "Alpine", color: "#0093cc" },
      { number: 10, name: "GAS", fullName: "Pierre Gasly", team: "Alpine", color: "#0093cc" },
      { number: 18, name: "STR", fullName: "Lance Stroll", team: "Aston Martin", color: "#229971" },
      { number: 20, name: "MAG", fullName: "Kevin Magnussen", team: "Haas", color: "#b6babd" },
      { number: 24, name: "ZHO", fullName: "Zhou Guanyu", team: "Kick Sauber", color: "#52e252" },
      { number: 77, name: "BOT", fullName: "Valtteri Bottas", team: "Kick Sauber", color: "#52e252" },
      { number: 2, name: "SAR", fullName: "Logan Sargeant", team: "Williams", color: "#64c4ff" },
    ];
  }, [board]);

  const d1Meta = useMemo(() => {
    const found = driversList.find((d) => d.number === d1);
    if (found) return found;
    return DRIVER_INFO[d1] || { name: `#${d1}`, fullName: `#${d1}`, team: "F1 Team", color: "#3671c6" };
  }, [driversList, d1]);

  // Real-time Cockpit Live Stream playback state
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(masterPlaying);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);

  // Sync with master play/pause state from race clock
  useEffect(() => {
    setIsPlaying(masterPlaying);
  }, [masterPlaying]);

  // Sync with master elapsed time when scrubbing
  useEffect(() => {
    if (d1Data.length === 0 || !masterElapsed) return;
    const step = Math.floor((masterElapsed * 3.7) % d1Data.length);
    setCurrentStep(step);
  }, [masterElapsed, d1Data.length]);

  // Fetch telemetry from local API or OpenF1 fallback
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const tryFetch = async () => {
      try {
        const res = await fetch(
          `/api/telemetry/compare?session_key=${selectedSession}&d1=${d1}&d2=${d2}&limit=800`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.driver1?.data?.length > 0 && !cancelled) {
            setD1Data(data.driver1.data);
            setD2Data(data.driver2.data || []);
            setLoading(false);
            return;
          }
        }
      } catch {
        // local api unreachable
      }

      // Direct fallback to OpenF1 if local API unavailable
      try {
        const [r1, r2] = await Promise.all([
          fetch(
            `https://api.openf1.org/v1/car_data?session_key=${selectedSession}&driver_number=${d1}`
          ).then((r) => r.json()),
          fetch(
            `https://api.openf1.org/v1/car_data?session_key=${selectedSession}&driver_number=${d2}`
          ).then((r) => r.json()),
        ]);

        if (cancelled) return;

        const p1 = (Array.isArray(r1) ? r1.slice(0, 800) : []).map((r) => ({
          date: r.date,
          speed: r.speed ?? 0,
          rpm: r.rpm ?? 0,
          gear: r.n_gear ?? 0,
          throttle: r.throttle ?? 0,
          brake: r.brake ?? 0,
          drs: r.drs ?? 0,
        }));

        const p2 = (Array.isArray(r2) ? r2.slice(0, 800) : []).map((r) => ({
          date: r.date,
          speed: r.speed ?? 0,
          rpm: r.rpm ?? 0,
          gear: r.n_gear ?? 0,
          throttle: r.throttle ?? 0,
          brake: r.brake ?? 0,
          drs: r.drs ?? 0,
        }));

        setD1Data(p1);
        setD2Data(p2);
      } catch (err) {
        console.error("Failed to load telemetry:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    tryFetch();

    return () => {
      cancelled = true;
    };
  }, [selectedSession, d1, d2]);

  // Smooth 60fps Real-time tick for Cockpit Gauge
  // Sync currentStep with master race clock when playing
  useEffect(() => {
    if ((masterPlaying || masterElapsed > 0) && d1Data.length > 0) {
      const step = Math.min(d1Data.length - 1, Math.max(0, Math.floor((masterElapsed * 3.7) % d1Data.length)));
      setCurrentStep(step);
    }
  }, [masterPlaying, masterElapsed, d1Data.length]);

  useEffect(() => {
    if (!isPlaying || d1Data.length === 0 || masterPlaying) return;

    // OpenF1 samples at ~3.7 Hz (approx 270ms per sample).
    // At 1x speed, step forward every 270ms. At 2x: 135ms. At 4x: 68ms.
    const intervalMs = Math.round(270 / playbackSpeed);

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % d1Data.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, d1Data.length, playbackSpeed, masterPlaying]);

  // Current active live point
  const currentLive = d1Data[currentStep] || {
    date: "",
    speed: 0,
    rpm: 0,
    gear: 0,
    throttle: 0,
    brake: 0,
    drs: 0,
  };

  // Downsample to 120 points for smooth waveform overlay
  const chartPoints = useMemo(() => {
    const len = Math.min(d1Data.length, d2Data.length);
    if (len === 0) return [];
    const step = Math.max(1, Math.floor(len / 120));
    const pts = [];
    for (let i = 0; i < len; i += step) {
      pts.push({
        idx: i,
        s1: d1Data[i]?.speed ?? 0,
        s2: d2Data[i]?.speed ?? 0,
        t1: d1Data[i]?.throttle ?? 0,
        t2: d2Data[i]?.throttle ?? 0,
        b1: d1Data[i]?.brake ?? 0,
        b2: d2Data[i]?.brake ?? 0,
        g1: d1Data[i]?.gear ?? 0,
        g2: d2Data[i]?.gear ?? 0,
      });
    }
    return pts;
  }, [d1Data, d2Data]);

  const maxSpeed = 340;
  const currentHover =
    hoverIndex != null && chartPoints[hoverIndex]
      ? chartPoints[hoverIndex]
      : chartPoints[chartPoints.length - 1];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 text-xs font-sans">
      {/* View Mode Toggle Header */}
      <div className="mb-2.5 flex items-center justify-between border-b border-border pb-2">
        <div className="flex gap-1 bg-surface-2 p-0.5 rounded-lg border border-border">
          <Button
            size="sm"
            variant={viewMode === "cockpit" ? "default" : "ghost"}
            className="h-7 px-2.5 text-[11px] font-bold"
            onClick={() => setViewMode("cockpit")}
          >
            <Radio className="size-3 mr-1 text-emerald-400" />
            Đồng hồ Live (F1 TV)
          </Button>
          <Button
            size="sm"
            variant={viewMode === "waveform" ? "default" : "ghost"}
            className="h-7 px-2.5 text-[11px] font-bold"
            onClick={() => setViewMode("waveform")}
          >
            <Activity className="size-3 mr-1 text-cyan-400" />
            Sóng Viễn Trắc
          </Button>
        </div>

        <Badge variant="outline" className="border-emerald-500/30 font-mono text-[10px] text-emerald-400">
          MongoDB Time-Series
        </Badge>
      </div>

      {/* Selectors Bar */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center justify-between rounded bg-surface-2 px-2.5 py-1 text-[11px]">
          <span className="flex items-center gap-1 text-muted">
            <Database className="size-3 text-cyan-400" /> Session:
          </span>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(Number(e.target.value))}
            className="bg-transparent font-medium text-fg outline-none cursor-pointer"
          >
            <option value={initialSessionKey} className="bg-surface text-fg font-bold">
              Chặng hiện tại (#{initialSessionKey})
            </option>
            <option value={9606} className="bg-surface text-fg">
              Singapore GP 2024 (#9606)
            </option>
            <option value={7787} className="bg-surface text-fg">
              Melbourne GP 2023 (#7787)
            </option>
            <option value={7953} className="bg-surface text-fg">
              Sakhir GP 2023 (#7953)
            </option>
            <option value={9070} className="bg-surface text-fg">
              Baku GP 2023 (#9070)
            </option>
            <option value={9094} className="bg-surface text-fg">
              Monaco GP 2023 (#9094)
            </option>
            <option value={9472} className="bg-surface text-fg">
              Sakhir GP 2024 (#9472)
            </option>
          </select>
        </div>

        <div className="flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-1 text-[11px]">
          <span className="text-muted text-[10px]">Tay đua:</span>
          <select
            value={d1}
            onChange={(e) => {
              const num = Number(e.target.value);
              setD1(num);
              onSelectDriver?.(num);
            }}
            className="bg-transparent font-bold text-fg outline-none cursor-pointer text-xs max-w-[130px] truncate"
          >
            {driversList.map((d) => (
              <option key={d.number} value={d.number} className="bg-surface text-fg">
                #{d.number} {d.name} ({d.team.slice(0, 3).toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
          <RefreshCw className="size-5 animate-spin text-emerald-400" />
          <span>Đang truyền luồng Telemetry thời gian thực…</span>
        </div>
      ) : d1Data.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted">
          <Database className="size-8 text-cyan-400 mb-2 opacity-60 animate-pulse" />
          <p className="font-semibold text-fg">Chưa có viễn trắc cho #{d1} ({d1Meta.name}) ở chặng #{selectedSession}</p>
          <p className="mt-1.5 text-[11px] text-subtle max-w-xs leading-relaxed">
            Hệ thống đang nạp Big Data. Bạn có thể chọn các chặng đã hoàn tất (như Sakhir, Melbourne, Singapore, Baku, Monaco) hoặc bấm tải lại bên dưới.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-7 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            onClick={() => {
              setLoading(true);
              fetch(`/api/telemetry/compare?session_key=${selectedSession}&d1=${d1}&d2=${d2}&limit=800`)
                .then((r) => r.json())
                .then((data) => {
                  if (data.driver1?.data?.length > 0) {
                    setD1Data(data.driver1.data);
                    setD2Data(data.driver2.data || []);
                  }
                })
                .finally(() => setLoading(false));
            }}
          >
            <RefreshCw className="size-3 mr-1" /> Thử nạp lại ngay
          </Button>
        </div>
      ) : viewMode === "cockpit" ? (
        /* MODE 1: COCKPIT GAUGE DIAL (EXACT FIA F1 TV BROADCAST STYLE) */
        <div className="flex flex-1 flex-col items-center justify-between space-y-3">
          <div className="w-full max-w-[340px]">
            {(() => {
              const is2026 = selectedSession >= 11300;
              const d1Row = board?.find((b) => b.driver_number === d1);
              // Always sync with d1Row when board is available so speed at race start is 0 km/h
              const isMasterActive = d1Row != null;

              const liveSpeed = isMasterActive && typeof d1Row?.speed === "number" ? d1Row.speed : currentLive.speed;
              const liveGear = isMasterActive && d1Row?.gear !== undefined
                ? (typeof d1Row.gear === "number" ? d1Row.gear : d1Row.gear === "N" ? 0 : Number(d1Row.gear) || 1)
                : currentLive.gear;
              const liveRpm = isMasterActive && typeof d1Row?.rpm === "number" ? d1Row.rpm : currentLive.rpm;
              const liveThrottle = isMasterActive && typeof d1Row?.throttle === "number" ? d1Row.throttle : currentLive.throttle;
              const liveBrake = isMasterActive && typeof d1Row?.brake === "number" ? d1Row.brake : currentLive.brake;
              const liveDrs = isMasterActive && typeof d1Row?.drs === "number" ? d1Row.drs : currentLive.drs;

              const isOvertake = is2026 ? Boolean(d1Row?.overtake_mode) : false;
              const isClipping = is2026 ? Boolean(d1Row?.is_clipping) : false;
              const batterySoc = is2026
                ? (typeof d1Row?.battery_soc === "number" ? d1Row.battery_soc : 85)
                : undefined;
              const deploymentKw = is2026
                ? (typeof d1Row?.deployment_kw === "number" ? d1Row.deployment_kw : (isClipping ? 0 : 280))
                : undefined;

              return (
                <CockpitGauge
                  driverName={d1Meta.name}
                  teamName={d1Meta.team}
                  teamColor={d1Meta.color}
                  speed={liveSpeed}
                  rpm={liveRpm}
                  gear={liveGear}
                  throttle={liveThrottle}
                  brake={liveBrake}
                  drs={liveDrs}
                  lapTime={masterElapsed <= 3.0 ? "GRID STANDING" : `REPLAY ${masterElapsed.toFixed(1)}s`}
                  year={is2026 ? 2026 : 2024}
                  overtakeMode={isOvertake}
                  isClipping={isClipping}
                  batterySoc={batterySoc}
                  deploymentKw={deploymentKw}
                />
              );
            })()}
          </div>

          {/* Real-time Playback Controller for Cockpit */}
          <div className="w-full rounded-xl border border-border bg-surface-2/60 p-2.5">
            {/* Scrubber timeline */}
            <div className="mb-2 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={Math.max(1, d1Data.length - 1)}
                value={currentStep}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-border rounded-lg"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2.5 text-xs font-bold"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="size-3.5 mr-1 text-amber-400" /> : <Play className="size-3.5 mr-1 text-emerald-400" />}
                  {isPlaying ? "Tạm dừng" : "Phát Realtime"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-7 p-0"
                  onClick={() => setCurrentStep(0)}
                  title="Chạy lại từ đầu"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1">
                {([1, 2, 4] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`h-6 px-2 rounded text-[10px] font-bold transition-all ${
                      playbackSpeed === spd
                        ? "bg-emerald-500 text-black shadow-sm"
                        : "bg-surface text-muted hover:text-fg"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: DUAL WAVEFORM OVERLAY */
        <div className="flex-1 space-y-3">
          {/* Dual Driver Selector */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1.5 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1">
              <span className="size-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-muted">Xe 1:</span>
              <select
                value={d1}
                onChange={(e) => setD1(Number(e.target.value))}
                className="bg-transparent font-bold text-blue-400 outline-none cursor-pointer text-xs"
              >
                <option value={1} className="bg-surface text-fg">#1 Verstappen</option>
                <option value={4} className="bg-surface text-fg">#4 Norris</option>
                <option value={44} className="bg-surface text-fg">#44 Hamilton</option>
                <option value={16} className="bg-surface text-fg">#16 Leclerc</option>
              </select>
            </div>

            <div className="flex flex-1 items-center gap-1.5 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1">
              <span className="size-2 rounded-full bg-orange-500" />
              <span className="text-[10px] text-muted">Xe 2:</span>
              <select
                value={d2}
                onChange={(e) => setD2(Number(e.target.value))}
                className="bg-transparent font-bold text-orange-400 outline-none cursor-pointer text-xs"
              >
                <option value={4} className="bg-surface text-fg">#4 Norris</option>
                <option value={1} className="bg-surface text-fg">#1 Verstappen</option>
                <option value={44} className="bg-surface text-fg">#44 Hamilton</option>
                <option value={16} className="bg-surface text-fg">#16 Leclerc</option>
              </select>
            </div>
          </div>

          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded border border-blue-500/20 bg-blue-500/5 p-2">
              <div className="font-semibold text-blue-400"># {d1} VERSTAPPEN</div>
              <div className="mt-1 flex justify-between font-mono text-[10px]">
                <span className="text-muted">Tốc độ:</span>
                <span className="font-bold text-fg">{currentHover?.s1 ?? 0} km/h</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-muted">Chân ga:</span>
                <span className="text-fg">{currentHover?.t1 ?? 0}%</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-muted">Hộp số:</span>
                <span className="text-fg">G{currentHover?.g1 ?? 0}</span>
              </div>
            </div>

            <div className="rounded border border-orange-500/20 bg-orange-500/5 p-2">
              <div className="font-semibold text-orange-400"># {d2} NORRIS</div>
              <div className="mt-1 flex justify-between font-mono text-[10px]">
                <span className="text-muted">Tốc độ:</span>
                <span className="font-bold text-fg">{currentHover?.s2 ?? 0} km/h</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-muted">Chân ga:</span>
                <span className="text-fg">{currentHover?.t2 ?? 0}%</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-muted">Hộp số:</span>
                <span className="text-fg">G{currentHover?.g2 ?? 0}</span>
              </div>
            </div>
          </div>

          {/* SPEED GRAPH */}
          <div className="rounded-lg border border-border bg-surface-2/40 p-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-fg">
                <Gauge className="size-3.5 text-blue-400" /> Tốc độ viễn trắc (Speed Waveform)
              </span>
              <span className="font-mono text-[10px] text-muted">0 - 340 km/h</span>
            </div>

            <div className="relative">
              <svg
                viewBox="0 0 400 95"
                className="w-full h-24 overflow-visible cursor-crosshair"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setHoverIndex(Math.floor(x * (chartPoints.length - 1)));
                }}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <line x1="0" y1="15" x2="400" y2="15" stroke="#333" strokeDasharray="3,3" />
                <line x1="0" y1="45" x2="400" y2="45" stroke="#333" strokeDasharray="3,3" />
                <line x1="0" y1="75" x2="400" y2="75" stroke="#333" strokeDasharray="3,3" />

                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  points={chartPoints
                    .map((p, i) => `${(i / (chartPoints.length - 1)) * 400},${90 - (p.s1 / maxSpeed) * 80}`)
                    .join(" ")}
                />

                <polyline
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                  points={chartPoints
                    .map((p, i) => `${(i / (chartPoints.length - 1)) * 400},${90 - (p.s2 / maxSpeed) * 80}`)
                    .join(" ")}
                />

                {hoverIndex != null && (
                  <line
                    x1={(hoverIndex / (chartPoints.length - 1)) * 400}
                    y1="0"
                    x2={(hoverIndex / (chartPoints.length - 1)) * 400}
                    y2="90"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                  />
                )}
              </svg>
            </div>
            <div className="mt-1 flex justify-between font-mono text-[9px] text-muted">
              <span>Đoạn cua (Braking Zone)</span>
              <span>Đoạn thẳng (DRS Straight)</span>
            </div>
          </div>

          {/* THROTTLE & BRAKE GRAPH */}
          <div className="rounded-lg border border-border bg-surface-2/40 p-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-fg">
                <Zap className="size-3.5 text-emerald-400" /> Chân ga (Throttle %) & Phanh (Brake)
              </span>
              <span className="font-mono text-[10px] text-muted">0 - 100%</span>
            </div>

            <svg viewBox="0 0 400 65" className="w-full h-16 overflow-visible">
              <line x1="0" y1="60" x2="400" y2="60" stroke="#333" />

              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.6"
                strokeDasharray="3,3"
                points={chartPoints
                  .map((p, i) => `${(i / (chartPoints.length - 1)) * 400},${60 - (p.t1 / 100) * 50}`)
                  .join(" ")}
              />

              <polyline
                fill="none"
                stroke="#f97316"
                strokeWidth="1.6"
                strokeDasharray="3,3"
                points={chartPoints
                  .map((p, i) => `${(i / (chartPoints.length - 1)) * 400},${60 - (p.t2 / 100) * 50}`)
                  .join(" ")}
              />
            </svg>
            <div className="mt-1 flex justify-between font-mono text-[9px] text-muted">
              <span>Nét đứt: % Đạp chân ga</span>
              <span>Nguồn: MongoDB <code>telemetry_stream</code></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
