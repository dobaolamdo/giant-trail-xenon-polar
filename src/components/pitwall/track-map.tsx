import { useEffect, useState, useMemo, useRef } from "react";
import { Compass, Eye, Zap, ZoomIn, ZoomOut, Maximize2, RotateCcw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LeaderboardRow } from "@/lib/f1/types";

type Point = { x: number; y: number; z?: number; date?: string };

interface TrackMapPanelProps {
  sessionKey?: number;
  masterPlaying?: boolean;
  masterElapsed?: number;
  board?: LeaderboardRow[];
  selectedDriver?: number | null;
  onSelectDriver?: (num: number) => void;
}

export function TrackMapPanel({
  sessionKey = 9606,
  masterPlaying = false,
  masterElapsed = 0,
  board = [],
  selectedDriver = null,
  onSelectDriver,
}: TrackMapPanelProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [car2Points, setCar2Points] = useState<Point[]>([]);
  const [sectors, setSectors] = useState<{ s1_end_index: number; s2_end_index: number }>({
    s1_end_index: 220,
    s2_end_index: 540,
  });
  const [loading, setLoading] = useState(false);
  const [displayMode, setDisplayMode] = useState<"grid" | "battle" | "focus">("grid");
  const [showCorners, setShowCorners] = useState(true);
  const [showDrs, setShowDrs] = useState(true);
  const [hoveredDriver, setHoveredDriver] = useState<number | null>(null);
  const [circuitInfo, setCircuitInfo] = useState<{ name: string; country: string; year: number }>({
    name: "Marina Bay",
    country: "Singapore",
    year: 2024,
  });

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const is2026 = circuitInfo.year === 2026;

  // Load circuit GPS layout
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadCoordinates = async () => {
      // 1. Local / Proxied API first (MongoDB Time-Series)
      try {
        const res = await fetch(`/api/track/layout?session_key=${sessionKey}&driver=1&lap=2`);
        if (res.ok) {
          const data = await res.json();
          if (data.points?.length > 50 && !cancelled) {
            // Clean duplicate consecutive points
            const cleaned: Point[] = [];
            for (const pt of data.points) {
              const last = cleaned[cleaned.length - 1];
              if (!last || Math.abs(pt.x - last.x) > 1 || Math.abs(pt.y - last.y) > 1) {
                cleaned.push(pt);
              }
            }
            setPoints(cleaned);
            setCar2Points(data.car2_points || []);
            if (data.sectors) setSectors(data.sectors);
            if (data.circuit_name) {
              setCircuitInfo({
                name: data.circuit_name,
                country: data.country_name || "",
                year: data.year || 2024,
              });
            }
            setLoading(false);
            return;
          }
        }
      } catch {
        // local API not reachable
      }

      // 2. OpenF1 fallback
      try {
        const res = await fetch(
          `https://api.openf1.org/v1/location?session_key=${sessionKey}&driver_number=1&date>=2024-09-22T12:05:38Z&date<=2024-09-22T12:07:18Z`
        );
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const pts = data.map((d) => ({
            x: d.x ?? 0,
            y: d.y ?? 0,
            z: d.z ?? 0,
            date: d.date,
          }));
          setPoints(pts);
        }
      } catch (err) {
        console.error("Failed to load GPS:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCoordinates();

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  // Compute adaptive SVG transformation with dynamic bounding box
  const {
    fullPath,
    s1Path,
    s2Path,
    s3Path,
    drs1Path,
    drs2Path,
    transformPoint,
    startFinishPos,
    keyCorners,
    s1GatePos,
    s2GatePos,
    viewBoxWidth,
    viewBoxHeight,
  } = useMemo(() => {
    if (points.length < 10) {
      return {
        fullPath: "",
        s1Path: "",
        s2Path: "",
        s3Path: "",
        drs1Path: "",
        drs2Path: "",
        transformPoint: (_p: Point) => ({ x: 0, y: 0 }),
        startFinishPos: null,
        keyCorners: [],
        s1GatePos: null,
        s2GatePos: null,
        viewBoxWidth: 800,
        viewBoxHeight: 600,
      };
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const maxDim = Math.max(spanX, spanY);
    const pad = maxDim * 0.08;

    const vbW = spanX + pad * 2;
    const vbH = spanY + pad * 2;

    const transform = (pt: Point) => ({
      x: pad + (pt.x - minX),
      // Invert Cartesian Y for SVG
      y: vbH - (pad + (pt.y - minY)),
    });

    const toSvgPath = (pts: Point[], close = false) => {
      if (!pts.length) return "";
      return (
        pts
          .map((p, i) => {
            const tp = transform(p);
            return `${i === 0 ? "M" : "L"} ${tp.x.toFixed(1)} ${tp.y.toFixed(1)}`;
          })
          .join(" ") + (close ? " Z" : "")
      );
    };

    const s1End = Math.min(sectors.s1_end_index, points.length - 1);
    const s2End = Math.min(sectors.s2_end_index, points.length - 1);

    const s1Pts = points.slice(0, s1End + 1);
    const s2Pts = points.slice(s1End, s2End + 1);
    const s3Pts = points.slice(s2End);

    // DRS / MOM Zones: Pit straight + back straight
    const drs1Pts = [
      ...points.slice(Math.floor(points.length * 0.94)),
      ...points.slice(0, Math.floor(points.length * 0.04)),
    ];
    const drs2Pts = points.slice(
      Math.floor(points.length * 0.22),
      Math.floor(points.length * 0.34)
    );

    // Corner apex positions
    const corners = [
      { name: "T1", pt: points[Math.floor(points.length * 0.07)], dx: pad * 0.25, dy: -pad * 0.2 },
      { name: "T3", pt: points[Math.floor(points.length * 0.11)], dx: -pad * 0.3, dy: -pad * 0.2 },
      { name: "T5", pt: points[Math.floor(points.length * 0.21)], dx: pad * 0.3, dy: pad * 0.2 },
      { name: "T7", pt: points[Math.floor(points.length * 0.35)], dx: -pad * 0.3, dy: -pad * 0.25 },
      { name: "T9", pt: points[Math.floor(points.length * 0.44)], dx: -pad * 0.35, dy: pad * 0.25 },
      { name: "T13", pt: points[Math.floor(points.length * 0.62)], dx: -pad * 0.3, dy: pad * 0.3 },
      { name: "T14", pt: points[Math.floor(points.length * 0.69)], dx: pad * 0.3, dy: pad * 0.2 },
      { name: "T16", pt: points[Math.floor(points.length * 0.81)], dx: pad * 0.3, dy: -pad * 0.25 },
      { name: "T19", pt: points[Math.floor(points.length * 0.93)], dx: pad * 0.3, dy: pad * 0.2 },
    ].map((c) => ({
      name: c.name,
      pos: transform(c.pt || points[0]),
      dx: c.dx,
      dy: c.dy,
    }));

    return {
      fullPath: toSvgPath(points, true),
      s1Path: toSvgPath(s1Pts, false),
      s2Path: toSvgPath(s2Pts, false),
      s3Path: toSvgPath(s3Pts, false),
      drs1Path: toSvgPath(drs1Pts, false),
      drs2Path: toSvgPath(drs2Pts, false),
      transformPoint: transform,
      startFinishPos: transform(points[0]),
      keyCorners: corners,
      s1GatePos: points[s1End] ? transform(points[s1End]) : null,
      s2GatePos: points[s2End] ? transform(points[s2End]) : null,
      viewBoxWidth: vbW,
      viewBoxHeight: vbH,
    };
  }, [points, sectors]);

  // Virtual lap duration in seconds for smooth interpolation (~98.8s per lap)
  const LAP_DURATION = 98.8;

  // Calculate live car positions for all leaderboard drivers
  const carMarkers = useMemo(() => {
    if (points.length === 0) return [];

    // Race standing on grid (elapsed <= 3.0s): All cars parked on grid slots
    const isGridStart = masterElapsed <= 3.0;
    const raceElapsed = Math.max(0, masterElapsed - 3.0);
    const leaderProgress = isGridStart ? 0 : (raceElapsed % LAP_DURATION) / LAP_DURATION;

    if (board && board.length > 0) {
      return board.map((row: any, index) => {
        const isLeader = index === 0;
        let carFraction = 0;

        // 1. Direct unified lap fraction from physics model (shell.tsx)
        if (typeof row.lap_fraction === "number") {
          carFraction = row.lap_fraction;
        } else if (isGridStart) {
          // Stationary on grid slots behind Start/Finish line
          const gridSlotOffset = (index * 0.007);
          carFraction = (1.0 - gridSlotOffset) % 1.0;
        } else if (!isLeader) {
          let gapSec = 0;
          if (typeof row.gap_to_leader === "number") {
            gapSec = row.gap_to_leader;
          } else if (typeof row.gap_to_leader === "string") {
            const clean = row.gap_to_leader.replace("+", "").replace("s", "").trim();
            const num = parseFloat(clean);
            if (!isNaN(num)) gapSec = num;
          } else if (row.fraction !== undefined && typeof row.fraction === "number") {
            carFraction = row.fraction;
          } else {
            gapSec = index * 2.2;
          }

          if (gapSec > 0) {
            const gapFraction = (gapSec % LAP_DURATION) / LAP_DURATION;
            carFraction = (leaderProgress - gapFraction + 1) % 1;
          }
        } else {
          carFraction = leaderProgress;
        }

        const ptIndex = Math.min(
          Math.max(0, Math.floor(carFraction * (points.length - 1))),
          points.length - 1
        );
        const pt = points[ptIndex] || points[0];
        const screenPos = transformPoint(pt);

        const rawCol = row.team_colour;
        const teamColor =
          typeof rawCol === "string"
            ? rawCol.startsWith("#")
              ? rawCol
              : `#${rawCol}`
            : "#3b82f6";

        const gapLabel =
          isLeader
            ? "LEADER"
            : typeof row.gap_to_leader === "number"
              ? `+${row.gap_to_leader.toFixed(3)}s`
              : typeof row.gap_to_leader === "string"
                ? row.gap_to_leader
                : "—";

        // Unified speed: directly from row.speed (calculated from unified physics model)
        const liveSpeed = isGridStart
          ? 0
          : typeof row.speed === "number"
            ? row.speed
            : 0;

        return {
          driver_number: row.driver_number,
          acronym: String(row.acronym || row.code || row.driver_number || ""),
          name: String(row.name || row.full_name || `Driver #${row.driver_number}`),
          team: String(row.team_name || row.team || ""),
          position: Number(row.live_rank || row.position || index + 1),
          teamColor,
          gap_to_leader: gapLabel,
          interval: String(row.interval || "—"),
          tyre: row.compound,
          x: screenPos.x,
          y: screenPos.y,
          speed: liveSpeed,
          overtake_mode: Boolean(row.overtake_mode),
          is_clipping: Boolean(row.is_clipping),
          battery_soc: row.battery_soc,
        };
      });
    }

    return [];
  }, [points, masterElapsed, board, transformPoint]);

  // Active drivers to display based on mode
  const displayedCars = useMemo(() => {
    if (displayMode === "focus" && selectedDriver) {
      return carMarkers.filter((c) => c.driver_number === selectedDriver);
    }
    if (displayMode === "battle") {
      return carMarkers.slice(0, 4);
    }
    return carMarkers;
  }, [carMarkers, displayMode, selectedDriver]);

  // Selected or hovered driver details for HUD
  const activeCar = useMemo(() => {
    if (hoveredDriver) {
      return carMarkers.find((c) => c.driver_number === hoveredDriver);
    }
    if (selectedDriver) {
      return carMarkers.find((c) => c.driver_number === selectedDriver);
    }
    return carMarkers[0] || null;
  }, [hoveredDriver, selectedDriver, carMarkers]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-2.5 text-xs font-sans">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2 font-bold text-fg">
          <Compass className="size-4 text-cyan-400" />
          <span className="text-sm tracking-wide">
            F1 Live Radar · {circuitInfo.name} ({circuitInfo.year})
          </span>
          {is2026 && (
            <Badge
              variant="outline"
              className="border-cyan-500/30 bg-cyan-500/10 font-mono text-[9px] text-cyan-400"
            >
              MOM OVERTAKE REGULATION
            </Badge>
          )}
        </div>

        {/* Display Mode Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-0.5 text-[11px]">
          <button
            onClick={() => setDisplayMode("grid")}
            className={`rounded px-2.5 py-0.5 font-medium transition-colors ${
              displayMode === "grid"
                ? "bg-cyan-500 text-black font-semibold shadow"
                : "text-muted hover:text-fg"
            }`}
          >
            20 Xe (Grid)
          </button>
          <button
            onClick={() => setDisplayMode("battle")}
            className={`rounded px-2.5 py-0.5 font-medium transition-colors ${
              displayMode === "battle"
                ? "bg-cyan-500 text-black font-semibold shadow"
                : "text-muted hover:text-fg"
            }`}
          >
            Top Battle
          </button>
          <button
            onClick={() => setDisplayMode("focus")}
            className={`rounded px-2.5 py-0.5 font-medium transition-colors ${
              displayMode === "focus"
                ? "bg-cyan-500 text-black font-semibold shadow"
                : "text-muted hover:text-fg"
            }`}
          >
            Xe chọn ({selectedDriver ? `#${selectedDriver}` : "P1"})
          </button>
        </div>
      </div>

      {/* Control bar: Turn badges, DRS/MOM, Zoom tools */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-[11px]">
        <div className="flex items-center gap-3 text-muted">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-fg select-none">
            <input
              type="checkbox"
              checked={showCorners}
              onChange={(e) => setShowCorners(e.target.checked)}
              className="accent-cyan-500 size-3 rounded"
            />
            <span>Góc cua</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-fg select-none">
            <input
              type="checkbox"
              checked={showDrs}
              onChange={(e) => setShowDrs(e.target.checked)}
              className="accent-emerald-500 size-3 rounded"
            />
            <span className={is2026 ? "text-cyan-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {is2026 ? "Vùng MOM Boost" : "Vùng DRS"}
            </span>
          </label>
        </div>

        {/* Zoom & Screen Fit Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="flex size-6 items-center justify-center rounded bg-surface hover:bg-surface-3 text-fg border border-border"
            title="Phóng to (+)"
          >
            <ZoomIn className="size-3.5 text-cyan-400" />
          </button>
          <span className="font-mono text-[10px] text-muted w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="flex size-6 items-center justify-center rounded bg-surface hover:bg-surface-3 text-fg border border-border"
            title="Thu nhỏ (-)"
          >
            <ZoomOut className="size-3.5 text-cyan-400" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="flex size-6 items-center justify-center rounded bg-surface hover:bg-surface-3 text-fg border border-border ml-1"
            title="Reset tỷ lệ fit màn hình"
          >
            <Maximize2 className="size-3 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Main Track Display Area */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-muted">
          <div className="flex items-center gap-2">
            <div className="size-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span>Đang dựng sa bàn đường đua chuẩn FIA từ dữ liệu tọa độ GPS…</span>
          </div>
        </div>
      ) : points.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center text-muted">
          <p>Chưa có dữ liệu GPS tọa độ cho phiên này.</p>
        </div>
      ) : (
        <div
          className={`relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#07090e] shadow-2xl ${
            zoom > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Top Left HUD: Circuit Info */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white tracking-widest uppercase">
                {circuitInfo.country ? `${circuitInfo.country} GP` : "F1 Race"}
              </span>
              <span className="font-mono text-[11px] font-black text-cyan-400 uppercase">
                {circuitInfo.name}
              </span>
            </div>
            <span className="text-[10px] text-muted font-mono">
              Lap {(board[0] as any)?.current_lap || (board[0] as any)?.last_lap || 2} · Replay {masterElapsed.toFixed(1)}s
            </span>
          </div>

          {/* Top Right HUD: Active Driver Card */}
          {activeCar && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/80 px-2.5 py-1.5 backdrop-blur shadow-lg pointer-events-none">
              <div
                className="flex size-6 items-center justify-center rounded-full font-mono text-[11px] font-black text-white shadow"
                style={{ backgroundColor: activeCar.teamColor }}
              >
                {activeCar.driver_number}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-fg text-xs">{activeCar.name}</span>
                  <Badge
                    variant="outline"
                    className="border-white/20 px-1 py-0 font-mono text-[9px] text-subtle"
                  >
                    P{activeCar.position}
                  </Badge>
                  {activeCar.is_clipping && (
                    <span className="rounded bg-red-600/30 px-1 font-mono text-[8px] font-black text-red-400 animate-pulse border border-red-500">
                      CLIP
                    </span>
                  )}
                  {activeCar.overtake_mode && (
                    <span className="rounded bg-cyan-600/30 px-1 font-mono text-[8px] font-black text-cyan-300 animate-pulse border border-cyan-400">
                      MOM
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
                  <span className="text-cyan-400 font-bold">{activeCar.speed} km/h</span>
                  <span>•</span>
                  <span>Gap: {activeCar.gap_to_leader}</span>
                  {typeof activeCar.battery_soc === "number" && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold">⚡ {activeCar.battery_soc}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SVG Map Canvas with Zoom & Pan transform */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <svg
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              className="w-full h-full select-none max-h-[640px]"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Tech Grid Pattern */}
                <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                </pattern>

                {/* Glow Filters */}
                <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glowFuchsia" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glowDrs" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background Grid */}
              <rect width={viewBoxWidth} height={viewBoxHeight} fill="url(#radarGrid)" />

              {/* 1. Track Underlay */}
              <path
                d={fullPath}
                fill="none"
                stroke="#0b0f19"
                strokeWidth={viewBoxWidth * 0.026}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 2. Track Asphalt Bed */}
              <path
                d={fullPath}
                fill="none"
                stroke="#1a202c"
                strokeWidth={viewBoxWidth * 0.016}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 3. Kerb Edge Line */}
              <path
                d={fullPath}
                fill="none"
                stroke="#2d3748"
                strokeWidth={viewBoxWidth * 0.011}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 4. Tri-Sector Racing Lines */}
              {/* S1: Gold */}
              <path
                d={s1Path}
                fill="none"
                stroke="#eab308"
                strokeWidth={viewBoxWidth * 0.004}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowGold)"
              />
              {/* S2: Electric Cyan */}
              <path
                d={s2Path}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={viewBoxWidth * 0.004}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowCyan)"
              />
              {/* S3: Vibrant Fuchsia */}
              <path
                d={s3Path}
                fill="none"
                stroke="#d946ef"
                strokeWidth={viewBoxWidth * 0.004}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowFuchsia)"
              />

              {/* 5. DRS / MOM Activation Zones */}
              {showDrs && (
                <>
                  <path
                    d={drs1Path}
                    fill="none"
                    stroke={is2026 ? "#06b6d4" : "#22c55e"}
                    strokeWidth={viewBoxWidth * 0.005}
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glowDrs)"
                  />
                  <path
                    d={drs2Path}
                    fill="none"
                    stroke={is2026 ? "#06b6d4" : "#22c55e"}
                    strokeWidth={viewBoxWidth * 0.005}
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glowDrs)"
                  />
                </>
              )}

              {/* 6. Sector Gate Dividing Markers */}
              {s1GatePos && (
                <g>
                  <circle cx={s1GatePos.x} cy={s1GatePos.y} r={viewBoxWidth * 0.005} fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                  <rect
                    x={s1GatePos.x - viewBoxWidth * 0.016}
                    y={s1GatePos.y - viewBoxWidth * 0.022}
                    width={viewBoxWidth * 0.032}
                    height={viewBoxWidth * 0.014}
                    rx="3"
                    fill="#06b6d4"
                  />
                  <text
                    x={s1GatePos.x}
                    y={s1GatePos.y - viewBoxWidth * 0.012}
                    fill="#000000"
                    fontSize={viewBoxWidth * 0.009}
                    fontFamily="monospace"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    S1 / S2
                  </text>
                </g>
              )}
              {s2GatePos && (
                <g>
                  <circle cx={s2GatePos.x} cy={s2GatePos.y} r={viewBoxWidth * 0.005} fill="#d946ef" stroke="#ffffff" strokeWidth="1.5" />
                  <rect
                    x={s2GatePos.x - viewBoxWidth * 0.016}
                    y={s2GatePos.y - viewBoxWidth * 0.022}
                    width={viewBoxWidth * 0.032}
                    height={viewBoxWidth * 0.014}
                    rx="3"
                    fill="#d946ef"
                  />
                  <text
                    x={s2GatePos.x}
                    y={s2GatePos.y - viewBoxWidth * 0.012}
                    fill="#000000"
                    fontSize={viewBoxWidth * 0.009}
                    fontFamily="monospace"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    S2 / S3
                  </text>
                </g>
              )}

              {/* 7. Start / Finish Line */}
              {startFinishPos && (
                <g>
                  <line
                    x1={startFinishPos.x - viewBoxWidth * 0.012}
                    y1={startFinishPos.y - viewBoxWidth * 0.008}
                    x2={startFinishPos.x + viewBoxWidth * 0.012}
                    y2={startFinishPos.y + viewBoxWidth * 0.008}
                    stroke="#ffffff"
                    strokeWidth={viewBoxWidth * 0.005}
                    strokeDasharray="3 3"
                  />
                  <circle cx={startFinishPos.x} cy={startFinishPos.y} r={viewBoxWidth * 0.007} fill="#ffffff" stroke="#22d3ee" strokeWidth="2" />
                  <rect
                    x={startFinishPos.x + viewBoxWidth * 0.012}
                    y={startFinishPos.y - viewBoxWidth * 0.012}
                    width={viewBoxWidth * 0.08}
                    height={viewBoxWidth * 0.018}
                    rx="3"
                    fill="#111827"
                    stroke="#22d3ee"
                    strokeWidth="1"
                  />
                  <text
                    x={startFinishPos.x + viewBoxWidth * 0.052}
                    y={startFinishPos.y + 1}
                    fill="#ffffff"
                    fontSize={viewBoxWidth * 0.009}
                    fontFamily="monospace"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    START / FINISH
                  </text>
                </g>
              )}

              {/* 8. Corner Turn Badges */}
              {showCorners &&
                keyCorners.map((c) => (
                  <g key={c.name} className="pointer-events-none">
                    <line x1={c.pos.x} y1={c.pos.y} x2={c.pos.x + c.dx} y2={c.pos.y + c.dy} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <circle cx={c.pos.x + c.dx} cy={c.pos.y + c.dy} r={viewBoxWidth * 0.01} fill="#181e2b" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                    <text
                      x={c.pos.x + c.dx}
                      y={c.pos.y + c.dy + viewBoxWidth * 0.0035}
                      fill="#ffffff"
                      fontSize={viewBoxWidth * 0.009}
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {c.name}
                    </text>
                  </g>
                ))}

              {/* 9. Live Driver Cars on Circuit */}
              {displayedCars.map((car) => {
                const isSelected = selectedDriver === car.driver_number;
                const isLeader = car.position === 1;

                return (
                  <g
                    key={car.driver_number}
                    className="cursor-pointer transition-transform duration-75 ease-out"
                    onClick={() => onSelectDriver?.(car.driver_number)}
                    onMouseEnter={() => setHoveredDriver(car.driver_number)}
                    onMouseLeave={() => setHoveredDriver(null)}
                  >
                    {/* Selected / Focus Radar Glow Ring */}
                    {isSelected && (
                      <circle
                        cx={car.x}
                        cy={car.y}
                        r={viewBoxWidth * 0.018}
                        fill="none"
                        stroke={car.teamColor}
                        strokeWidth="2"
                        opacity="0.8"
                        className="animate-ping"
                      />
                    )}

                    {/* MOM Overtake Aura Ring in 2026 */}
                    {is2026 && car.overtake_mode && (
                      <circle
                        cx={car.x}
                        cy={car.y}
                        r={viewBoxWidth * 0.014}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeDasharray="3 3"
                        className="animate-spin"
                      />
                    )}

                    {/* Clipping Warning Beacon */}
                    {car.is_clipping && (
                      <circle
                        cx={car.x}
                        cy={car.y}
                        r={viewBoxWidth * 0.016}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                    )}

                    {/* Car Halo Dot */}
                    <circle
                      cx={car.x}
                      cy={car.y}
                      r={isLeader || isSelected ? viewBoxWidth * 0.012 : viewBoxWidth * 0.009}
                      fill={car.teamColor}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? "2.5" : "1.2"}
                      className="shadow-lg"
                    />

                    {/* Driver Acronym Tag Pill */}
                    <g transform={`translate(${car.x + viewBoxWidth * 0.012}, ${car.y - viewBoxWidth * 0.01})`}>
                      <rect
                        x="-1"
                        y="-8"
                        width={car.acronym.length * 6 + 12}
                        height="12"
                        rx="2"
                        fill="rgba(0, 0, 0, 0.85)"
                        stroke={car.teamColor}
                        strokeWidth="1"
                      />
                      <text
                        x={car.acronym.length * 3 + 5}
                        y="1"
                        fill="#ffffff"
                        fontSize={viewBoxWidth * 0.0085}
                        fontFamily="monospace"
                        fontWeight="black"
                        textAnchor="middle"
                      >
                        {car.acronym}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}