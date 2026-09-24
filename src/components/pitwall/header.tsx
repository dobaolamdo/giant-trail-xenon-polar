import { useEffect, useState } from "react";
import {
  Cloud,
  Database,
  Droplets,
  Flag,
  Gauge,
  Thermometer,
  Trophy,
  Wind,
} from "lucide-react";
import {
  Get_Meeting,
  Get_Session_Info,
  Get_Session_Weather,
  currentLapNumber,
  getFeed,
  hasTimingFeed,
  isLiveSession,
  isRaceFinished,
} from "@/lib/f1/api";
import { formatClock } from "@/lib/f1/format";
import { useRaceClock } from "@/lib/f1/clock";
import { usePitwall } from "@/lib/f1/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OpenMeta = {
  meeting_name: string;
  circuit_short_name: string;
  country_name?: string;
  year?: number;
};

export function TimingHeader() {
  const elapsed = useRaceClock((s) => s.elapsed);
  const playing = useRaceClock((s) => s.playing);
  const sessionKey = usePitwall((s) => s.sessionKey);
  const view = usePitwall((s) => s.view);
  const goLive = usePitwall((s) => s.goLive);
  const openArchive = usePitwall((s) => s.openArchive);
  const setView = usePitwall((s) => s.setView);
  const archiveElapsed = usePitwall((s) => s.archiveElapsed);
  const archiveDuration = usePitwall((s) => s.archiveDuration);
  const archiveLap = usePitwall((s) => s.archiveLap);
  const archiveMaxLap = usePitwall((s) => s.archiveMaxLap);
  const archiveWeather = usePitwall((s) => s.archiveWeather);
  const session = Get_Session_Info(sessionKey);
  const meeting = Get_Meeting(sessionKey);
  const live = isLiveSession(sessionKey);
  const replay = !live && hasTimingFeed(sessionKey);
  const feed = getFeed(sessionKey);
  const simWeather =
    live || replay ? Get_Session_Weather(sessionKey, elapsed) : null;
  const lap = live || replay ? currentLapNumber(sessionKey, elapsed) : null;
  const finished = (live || replay) && isRaceFinished(sessionKey, elapsed);
  const totalLaps = feed?.totalLaps ?? 0;

  const isOpenF1 = sessionKey >= 9000;
  const [openMeta, setOpenMeta] = useState<OpenMeta | null>(null);

  useEffect(() => {
    if (!isOpenF1) {
      setOpenMeta(null);
      return;
    }
    const base =
      import.meta.env.VITE_API_URL || "https://f1-dashboard-sbrl.onrender.com";
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${base}/api/sessions?year=2024`);
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const hit = data.find(
          (r: { session_key: number }) => Number(r.session_key) === sessionKey,
        );
        if (hit) {
          setOpenMeta({
            meeting_name: String(
              hit.meeting_name ||
                hit.circuit_short_name ||
                `Session ${sessionKey}`,
            ),
            circuit_short_name: String(hit.circuit_short_name || ""),
            country_name: hit.country_name
              ? String(hit.country_name)
              : undefined,
            year: hit.year != null ? Number(hit.year) : 2024,
          });
        }
      } catch {
        if (!cancelled) setOpenMeta(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionKey, isOpenF1]);

  const weather = isOpenF1 ? archiveWeather : simWeather;
  const showWeatherBar =
    view === "timing" &&
    weather &&
    (isOpenF1
      ? archiveMaxLap > 0
      : lap != null);

  const titleLine =
    view === "standings"
      ? "Archive · OpenF1 + MySQL"
      : view === "schema"
        ? "MySQL · Trigger · Procedure"
        : isOpenF1 && openMeta
          ? `${openMeta.meeting_name} · ${openMeta.circuit_short_name}`
          : live
            ? `Live · ${session?.meeting_name ?? "—"} · ${session?.circuit_short_name ?? "—"}`
            : `Replay · ${session?.meeting_name ?? "—"} · ${session?.circuit_short_name ?? "—"}`;

  return (
    <header className="flex flex-col gap-3 px-3 pt-3 pb-2 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-6 w-1 rounded-full bg-accent"
              aria-hidden
            />
            <h1 className="text-2xl font-extrabold tracking-[0.18em] text-fg sm:text-3xl">
              PITWALL
            </h1>
          </div>
          <p className="mt-1 truncate pl-3 text-sm tracking-wider text-muted uppercase">
            {titleLine}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={view === "timing" && live ? "secondary" : "ghost"}
              onClick={() => goLive()}
              className="gap-1.5"
              aria-label="Live"
            >
              <Flag className="size-3.5" />
              <span className="hidden sm:inline">Live</span>
            </Button>
            <Button
              size="sm"
              variant={
                view === "standings" || (view === "timing" && !live)
                  ? "secondary"
                  : "ghost"
              }
              onClick={() => openArchive()}
              className="gap-1.5"
              aria-label="Archive"
            >
              <Trophy className="size-3.5" />
              <span className="hidden sm:inline">Archive</span>
            </Button>
            <Button
              size="sm"
              variant={view === "schema" ? "secondary" : "ghost"}
              onClick={() => setView("schema")}
              className="gap-1.5"
              aria-label="Schema"
            >
              <Database className="size-3.5" />
              <span className="hidden sm:inline">Schema</span>
            </Button>
          </div>
          {view === "timing" && (
            <div className="flex items-center gap-2">
              <Badge
                variant={live ? (finished ? "muted" : "live") : "muted"}
                className="gap-1.5"
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-current",
                    (live || replay) && playing && !finished && "live-dot",
                  )}
                />
                {isOpenF1
                  ? "OpenF1 · DB"
                  : live
                    ? finished
                      ? "Finish"
                      : playing
                        ? "Live"
                        : "Paused"
                    : finished
                      ? "Result"
                      : playing
                        ? "Replay"
                        : "Paused"}
              </Badge>
              <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs tracking-wide text-fg tabular">
                {isOpenF1
                  ? `key ${sessionKey}`
                  : meeting
                    ? `${meeting.year} · R${meeting.round}`
                    : session?.session_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {showWeatherBar && weather && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surface px-3 py-2 shadow-[var(--shadow-border)]">
          <WeatherChip
            icon={Thermometer}
            label="Air"
            value={`${weather.air_temperature.toFixed(1)}°`}
          />
          <WeatherChip
            icon={Gauge}
            label="Track"
            value={`${weather.track_temperature.toFixed(1)}°`}
          />
          <WeatherChip
            icon={Droplets}
            label="Hum"
            value={`${Math.round(weather.humidity)}%`}
          />
          <WeatherChip
            icon={Wind}
            label="Wind"
            value={`${weather.wind_speed.toFixed(1)}`}
          />
          <WeatherChip
            icon={Cloud}
            label="Sky"
            value={weather.rainfall ? "Rain" : "Dry"}
          />
          <span className="ml-auto flex items-baseline gap-2">
            <span className="text-xs tracking-widest text-muted uppercase">
              Lap
            </span>
            <span className="font-mono text-lg font-semibold tabular">
              {String(
                isOpenF1 ? archiveLap : (lap ?? 0),
              ).padStart(2, "0")}
              <span className="text-sm text-muted">
                /{isOpenF1 ? archiveMaxLap : totalLaps}
              </span>
            </span>
            <span className="font-mono text-xs text-muted tabular">
              {formatClock(isOpenF1 ? archiveElapsed : elapsed)}
              {isOpenF1 && archiveDuration > 0
                ? ` / ${formatClock(archiveDuration)}`
                : ""}
            </span>
          </span>
        </div>
      )}
    </header>
  );
}

function WeatherChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cloud;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Icon className="size-3.5 text-muted" aria-hidden />
      <span className="text-xs tracking-wider text-muted uppercase">{label}</span>
      <span className="font-mono text-sm tabular text-fg">{value}</span>
    </span>
  );
}
