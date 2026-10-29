import { useEffect, useState, useMemo } from "react";
import { Clock, Calendar, MapPin, Flag, Play, Compass, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCountryFlag, getNextGrandPrix, CALENDAR_2026, type F1RaceSchedule } from "@/lib/f1/flags";
import { usePitwall } from "@/lib/f1/store";
import { BAKU_RACE_KEY } from "@/lib/f1/baku-fallback";

export function LiveCountdownBanner() {
  const setSessionKey = usePitwall((s) => s.setSessionKey);
  const setView = usePitwall((s) => s.setView);
  const setYear = usePitwall((s) => s.setYear);
  const setStandingsTab = usePitwall((s) => s.setStandingsTab);

  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedRound, setSelectedRound] = useState<number | "auto">("auto");

  // Tick countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const autoRace = useMemo<F1RaceSchedule>(() => getNextGrandPrix(now), [now]);

  const activeRace = useMemo<F1RaceSchedule>(() => {
    if (selectedRound === "auto") return autoRace;
    return CALENDAR_2026.find((r) => r.round === selectedRound) || autoRace;
  }, [selectedRound, autoRace]);

  // Compute countdown remaining
  const { days, hours, minutes, seconds, isPast } = useMemo(() => {
    const target = new Date(activeRace.date_start).getTime();
    const diff = target - now.getTime();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return { days: d, hours: h, minutes: m, seconds: s, isPast: false };
  }, [activeRace, now]);

  // User's browser timezone detection & friendly format
  const { userTz, formattedDate, systemDateStr } = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const target = new Date(activeRace.date_start);
      const str = new Intl.DateTimeFormat("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(target);
      const sysStr = new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);
      return { userTz: tz, formattedDate: str, systemDateStr: sysStr };
    } catch {
      return {
        userTz: "UTC",
        formattedDate: activeRace.date_start.slice(0, 16).replace("T", " "),
        systemDateStr: now.toISOString().slice(0, 10),
      };
    }
  }, [activeRace, now]);

  const flag = getCountryFlag(activeRace.country_name);

  return (
    <div className="relative overflow-hidden rounded-xl border border-red-500/35 bg-gradient-to-r from-surface-2 via-surface to-surface-2 p-3 sm:p-4 shadow-xl">
      {/* Background glow and subtle checker pattern */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-red-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 size-48 rounded-full bg-cyan-600/10 blur-3xl" />

      {/* QUICK PRESET CHIPS */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 border-b border-white/5 pb-2">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-1">
          Chọn chặng đếm:
        </span>
        <button
          type="button"
          onClick={() => setSelectedRound("auto")}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
            selectedRound === "auto"
              ? "bg-red-600 text-white shadow-sm shadow-red-950"
              : "bg-surface-2 text-muted hover:text-fg border border-border"
          }`}
        >
          ⚡ Chặng kế tiếp ({autoRace.circuit_short_name})
        </button>
        <button
          type="button"
          onClick={() => setSelectedRound(1)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
            selectedRound === 1
              ? "bg-cyan-600 text-white shadow-sm shadow-cyan-950"
              : "bg-surface-2 text-muted hover:text-fg border border-border"
          }`}
        >
          🇦🇺 Mở màn 2026: Australian GP
        </button>
        <button
          type="button"
          onClick={() => setSelectedRound(17)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
            selectedRound === 17
              ? "bg-amber-600 text-white shadow-sm shadow-amber-950"
              : "bg-surface-2 text-muted hover:text-fg border border-border"
          }`}
        >
          🇦🇿 Chặng Live Sim (Baku)
        </button>
        <select
          aria-label="Chọn chặng đếm ngược"
          value={selectedRound}
          onChange={(e) => setSelectedRound(e.target.value === "auto" ? "auto" : Number(e.target.value))}
          className="h-6 text-[10px] font-mono bg-surface border border-border/80 rounded px-1.5 text-fg focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer ml-auto"
        >
          <option value="auto">⚡ Tự động: Chặng kế tiếp ({autoRace.circuit_short_name})</option>
          <optgroup label="Tất cả 24 chặng mùa 2026">
            {CALENDAR_2026.map((r) => (
              <option key={r.round} value={r.round}>
                {getCountryFlag(r.country_name)} R{String(r.round).padStart(2, "0")}: {r.meeting_name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Grand Prix Details */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="live" className="gap-1 px-2 py-0.5 text-[10px] tracking-wider uppercase">
              <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
              Đếm Ngược F1 2026
            </Badge>
            <span className="font-mono text-xs text-muted">Round {String(activeRace.round).padStart(2, "0")} / 24</span>
            {isPast && (
              <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                Chặng này đã kết thúc
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl" role="img" aria-label={activeRace.country_name}>
              {flag}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-sans text-base font-black tracking-wide text-fg uppercase sm:text-lg">
                {activeRace.meeting_name}
              </h3>
              <p className="flex items-center gap-1.5 text-xs text-subtle">
                <MapPin className="size-3 text-red-400 shrink-0" />
                <span className="truncate">{activeRace.circuit_short_name}, {activeRace.country_name}</span>
                <span className="hidden sm:inline text-muted">·</span>
                <span className="hidden sm:inline font-mono text-emerald-400">🕒 {formattedDate}</span>
              </p>
            </div>
          </div>

          {/* Timezone banner & explanation */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <div className="flex items-center gap-1.5">
              <Compass className="size-3 text-cyan-400 shrink-0" />
              <span>Múi giờ máy bạn: <b className="text-fg">{userTz}</b> ({formattedDate})</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-300/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <AlertCircle className="size-3 shrink-0 text-amber-400" />
              <span>
                Ngày hệ thống máy tính của bạn: <b>{systemDateStr}</b> → Đếm tới <b>{activeRace.date_start.slice(0, 10)}</b> ({activeRace.circuit_short_name})
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Flip Countdown Clock */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <CountdownBox value={days} label="NGÀY" />
          <span className="font-mono text-xl font-bold text-red-500 animate-pulse">:</span>
          <CountdownBox value={hours} label="GIỜ" />
          <span className="font-mono text-xl font-bold text-red-500 animate-pulse">:</span>
          <CountdownBox value={minutes} label="PHÚT" />
          <span className="font-mono text-xl font-bold text-red-500 animate-pulse">:</span>
          <CountdownBox value={seconds} label="GIÂY" highlight />
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-500 shadow-md shadow-red-950/40"
            onClick={() => setSessionKey(BAKU_RACE_KEY)}
          >
            <Play className="size-3.5 fill-white" />
            <span>Xem Demo Live (Baku 2026)</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-border/80 bg-surface-2/80 px-3 text-xs text-fg hover:bg-surface-2 hover:text-white"
            onClick={() => {
              setYear(2026);
              setStandingsTab("calendar");
              setView("standings");
            }}
          >
            <Calendar className="size-3.5 text-cyan-400" />
            <span>Lịch Thi Đấu 2026 ({CALENDAR_2026.length} Chặng)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CountdownBox({
  value,
  label,
  highlight = false,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-lg border font-mono text-lg sm:text-xl font-black shadow-inner ${
          highlight
            ? "border-red-500/50 bg-red-600/20 text-red-400 shadow-red-950/50"
            : "border-border/80 bg-surface-2 text-fg"
        }`}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-1 font-mono text-[9px] font-semibold text-muted tracking-wider">
        {label}
      </span>
    </div>
  );
}