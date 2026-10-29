import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Zap, AlertTriangle, BatteryWarning, ShieldAlert } from "lucide-react";

type Props = {
  driverName?: string;
  teamName?: string;
  teamColor?: string;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: number;
  lapTime?: string;
  year?: number;
  batterySoc?: number;
  deploymentKw?: number;
  overtakeMode?: boolean;
  isClipping?: boolean;
};

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  if (endAngle <= startAngle) return "";
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

export function CockpitGauge({
  driverName = "HAMILTON",
  teamName = "Mercedes",
  teamColor = "#00d2be",
  speed = 250,
  rpm = 9328,
  gear = 4,
  throttle = 85,
  brake = 0,
  drs = 1,
  lapTime = ":17.552",
  year = 2024,
  batterySoc = 82,
  deploymentKw = 280,
  overtakeMode = false,
  isClipping = false,
}: Props) {
  const is2026 = year === 2026;
  const cx = 160;
  const cy = 160;

  // Outer speed ring: -135deg to +135deg (270deg span)
  const speedMax = 360;
  const speedAngle = -135 + Math.min(1, Math.max(0, speed / speedMax)) * 270;
  const speedTrack = describeArc(cx, cy, 130, -135, 135);
  const speedFill = describeArc(cx, cy, 130, -135, speedAngle);

  // Throttle arc (left side): -130deg to -50deg (80deg span)
  const throttleAngle = -130 + Math.min(1, Math.max(0, throttle / 100)) * 80;
  const throttleTrack = describeArc(cx, cy, 105, -130, -50);
  const throttleFill = describeArc(cx, cy, 105, -130, throttleAngle);

  // Brake arc (right side): 50deg to 130deg (80deg span)
  const brakeAngle = 50 + Math.min(1, Math.max(0, brake > 0 ? (brake > 1 ? brake / 100 : brake) : 0)) * 80;
  const brakeTrack = describeArc(cx, cy, 105, 50, 130);
  const brakeFill = describeArc(cx, cy, 105, 50, brakeAngle);

  const isDrsActive = Boolean(drs) && !is2026;
  const aeroMode = speed > 260 ? "X-MODE" : "Z-MODE";

  return (
    <div className="relative flex flex-col items-center justify-center select-none rounded-2xl bg-gradient-to-b from-[#141622] via-[#0f111a] to-[#0a0c12] p-4 text-white shadow-2xl border border-white/5">
      {/* Top Driver Header (F1 TV Broadcast Style) */}
      <div className="mb-2 flex w-full items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div
            className="size-3 rounded-full shadow-[0_0_8px]"
            style={{ backgroundColor: teamColor, boxShadow: `0 0 10px ${teamColor}` }}
          />
          <div>
            <div className="text-sm font-black tracking-wider uppercase">{driverName}</div>
            <div className="text-[10px] font-semibold text-white/50 tracking-wide">{teamName}</div>
          </div>
        </div>
        <div className="font-mono text-sm font-bold text-white/70 tracking-tight">{lapTime}</div>
      </div>

      {/* Main Circular Dial */}
      <div className="relative size-[280px]">
        <svg viewBox="0 0 320 320" className="size-full">
          {/* Outer Dial Background Glow */}
          <circle cx={cx} cy={cy} r={140} fill="rgba(255,255,255,0.015)" />

          {/* Speed Scale Ticks */}
          {[
            { val: 0, a: -135 },
            { val: 60, a: -90 },
            { val: 120, a: -45 },
            { val: 180, a: 0 },
            { val: 240, a: 45 },
            { val: 300, a: 90 },
            { val: 360, a: 135 },
          ].map((t) => {
            const p1 = polarToCartesian(cx, cy, 138, t.a);
            const p2 = polarToCartesian(cx, cy, 144, t.a);
            const textPos = polarToCartesian(cx, cy, 153, t.a);
            return (
              <g key={t.val}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="2"
                />
                <text
                  x={textPos.x}
                  y={textPos.y + 3}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.4)"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {t.val}
                </text>
              </g>
            );
          })}

          {/* 1. Outer Speed Arc */}
          <path
            d={speedTrack}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {speedFill && (
            <path
              d={speedFill}
              fill="none"
              stroke="url(#speedGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          )}

          {/* 2. Throttle Arc (Left, Green) */}
          <path
            d={throttleTrack}
            fill="none"
            stroke="rgba(34,197,94,0.12)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          {throttleFill && (
            <path
              d={throttleFill}
              fill="none"
              stroke="#22c55e"
              strokeWidth="18"
              strokeLinecap="round"
              className="transition-all duration-75 shadow-[0_0_15px_#22c55e]"
            />
          )}

          {/* 3. Brake Arc (Right, Red) */}
          <path
            d={brakeTrack}
            fill="none"
            stroke="rgba(239,68,68,0.12)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          {brakeFill && (
            <path
              d={brakeFill}
              fill="none"
              stroke="#ef4444"
              strokeWidth="18"
              strokeLinecap="round"
              className="transition-all duration-75 shadow-[0_0_15px_#ef4444]"
            />
          )}

          {/* Throttle & Brake Labels */}
          <text
            x="80"
            y="125"
            transform="rotate(-45 80 125)"
            fill="#ffffff"
            fontSize="9"
            fontWeight="900"
            letterSpacing="2"
          >
            THROTTLE
          </text>
          <text
            x="225"
            y="135"
            transform="rotate(45 225 135)"
            fill="#ffffff"
            fontSize="9"
            fontWeight="900"
            letterSpacing="2"
          >
            BRAKE
          </text>

          {/* Gradients */}
          <defs>
            <linearGradient id="speedGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Digital Readouts */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* SPEED */}
          <div className="text-4xl font-black tracking-tight text-white font-mono drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
            {Math.round(speed)}
          </div>
          <div className="text-[10px] font-bold tracking-widest text-white/50 -mt-1 mb-1">
            KMH
          </div>

          {/* RPM */}
          <div className="text-lg font-bold font-mono tracking-tight text-white/90">
            {Math.round(rpm)}
          </div>
          <div className="text-[9px] font-bold tracking-widest text-white/40 -mt-0.5 mb-1.5">
            RPM
          </div>

          {/* 2026 MOM / CLIPPING vs PRE-2026 DRS BADGE */}
          {is2026 ? (
            isClipping ? (
              <div className="px-2.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-red-600 text-white animate-pulse shadow-[0_0_15px_#dc2626]">
                ⚠️ SUPER CLIPPING
              </div>
            ) : overtakeMode ? (
              <div className="px-2.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-cyan-400 text-black shadow-[0_0_15px_#06b6d4] animate-pulse">
                ⚡ MOM ACTIVE (350kW)
              </div>
            ) : (
              <div className="px-2.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-white/10 text-white/60">
                {aeroMode}
              </div>
            )
          ) : (
            <div
              className={`px-3 py-0.5 rounded text-[10px] font-black tracking-wider transition-all duration-100 ${
                isDrsActive
                  ? "bg-[#00ff41] text-black shadow-[0_0_15px_#00ff41] scale-105"
                  : "bg-white/10 text-white/30"
              }`}
            >
              DRS
            </div>
          )}

          {/* GEAR */}
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[9px] font-bold tracking-wider text-white/50">GEAR</span>
            <span className="text-2xl font-black font-mono text-white">
              {gear === 0 ? "N" : gear}
            </span>
          </div>
        </div>
      </div>

      {/* 2026 POWER UNIT TELEMETRY HUD (Battery SOC & 350kW MGU-K Deployment) */}
      {is2026 && (
        <div className="mt-3 w-full rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5 text-xs font-mono">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-300">
              <Zap className="size-3.5 text-amber-400" /> 2026 FIA MGU-K (350kW)
            </span>
            <span className="text-[10px] text-muted">Aero: {aeroMode}</span>
          </div>

          {/* Battery State of Charge */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted">Battery SOC</span>
              <span className={batterySoc <= 18 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                {batterySoc}% {batterySoc <= 18 && "⚠️ DE-RATE"}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  batterySoc <= 18 ? "bg-red-500" : batterySoc < 40 ? "bg-amber-400" : "bg-cyan-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, batterySoc))}%` }}
              />
            </div>
          </div>

          {/* MGU-K Deployment kW */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted">Electric Deployment</span>
              <span className="text-cyan-300 font-bold">{deploymentKw} kW / 350 kW</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100"
                style={{ width: `${Math.min(100, Math.max(0, (deploymentKw / 350) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}