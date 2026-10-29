import { useEffect, useMemo, useState } from "react";
import { Play, Trophy, Calendar, MapPin, Database, Zap, Compass, Flag } from "lucide-react";
import {
  Get_Season_Meetings,
  Get_Seasons,
  SESSION_KEY,
} from "@/lib/f1/api";
import {
  fetchYearStandings,
  type ConstructorStandingRow,
  type DriverStandingRow,
} from "@/lib/f1/standings-live";
import { usePitwall } from "@/lib/f1/store";
import { splitName } from "@/lib/f1/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, onTeam, teamHex } from "@/lib/utils";
import { getCountryFlag, CALENDAR_2026 } from "@/lib/f1/flags";
import { BAKU_RACE_KEY } from "@/lib/f1/baku-fallback";
import { LiveCountdownBanner } from "./live-countdown";

type ApiSession = {
  session_key: number;
  session_name?: string;
  session_type?: string;
  date_start?: string | null;
  meeting_key?: number;
  meeting_name?: string | null;
  circuit_short_name?: string | null;
  country_name?: string | null;
  location?: string | null;
  year?: number | null;
};

type MeetingGroup = {
  meeting_key: number;
  round?: number;
  title: string;
  circuit: string;
  country: string;
  date: string;
  rawDateStart?: string | null;
  sessions: ApiSession[];
  hasBigData?: boolean;
};

const SESSION_ORDER = [
  "Practice 1",
  "Practice 2",
  "Practice 3",
  "Sprint Qualifying",
  "Sprint",
  "Qualifying",
  "Race",
];

function sessionSortKey(name: string) {
  const i = SESSION_ORDER.findIndex(
    (x) => x.toLowerCase() === name.toLowerCase(),
  );
  return i >= 0 ? i : 50;
}

function isLockPayload(data: unknown): boolean {
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    /restrict|live f1|session in progress/i.test(
      String((data as { detail?: string }).detail ?? ""),
    )
  );
}

function formatWithUserTimezone(dateStr?: string | null): string {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function ArchiveView() {
  const year = usePitwall((s) => s.year);
  const setYear = usePitwall((s) => s.setYear);
  const tab = usePitwall((s) => s.standingsTab);
  const setTab = usePitwall((s) => s.setStandingsTab);
  const openSession = usePitwall((s) => s.setSessionKey);
  const seasons = Get_Seasons();
  const meetingsLocal = Get_Season_Meetings(year);

  const [drivers, setDrivers] = useState<DriverStandingRow[]>([]);
  const [teams, setTeams] = useState<ConstructorStandingRow[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsHint, setStandingsHint] = useState("");
  const leader = drivers[0];

  const [apiSessions, setApiSessions] = useState<ApiSession[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [source, setSource] = useState<"openf1" | "db" | "calendar2026" | "none">("none");
  const [hint, setHint] = useState("");

  const userTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStandingsLoading(true);
    setStandingsHint("");
    (async () => {
      try {
        const { drivers: d, teams: tm, racesUsed } =
          await fetchYearStandings(year);
        if (cancelled) return;
        setDrivers(d);
        setTeams(tm);
        setStandingsHint(
          racesUsed > 0
            ? `FIA · ${racesUsed} rounds`
            : year === 2026
              ? "Mùa giải 2026 đang diễn ra · Lịch 24 chặng đua chính thức"
              : "Chưa có bảng điểm năm này",
        );
      } catch {
        if (!cancelled) {
          setDrivers([]);
          setTeams([]);
          setStandingsHint(year === 2026 ? "Mùa giải 2026 đang diễn ra" : "Không tải được bảng điểm FIA");
        }
      } finally {
        if (!cancelled) setStandingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    let cancelled = false;
    setApiLoading(true);
    setHint("");

    (async () => {
      const base =
        import.meta.env.VITE_API_URL ||
        "https://f1-dashboard-sbrl.onrender.com";

      const mapOf1 = (data: any[], y: number): ApiSession[] =>
        data
          .map((r) => ({
            session_key: Number(r.session_key),
            session_name:
              r.session_name != null ? String(r.session_name) : undefined,
            session_type:
              r.session_type != null ? String(r.session_type) : undefined,
            date_start: r.date_start != null ? String(r.date_start) : null,
            meeting_key:
              r.meeting_key != null ? Number(r.meeting_key) : undefined,
            meeting_name:
              r.meeting_name != null
                ? String(r.meeting_name)
                : r.location != null
                  ? `${r.location} Grand Prix`
                  : null,
            circuit_short_name:
              r.circuit_short_name != null
                ? String(r.circuit_short_name)
                : null,
            country_name:
              r.country_name != null ? String(r.country_name) : null,
            location: r.location != null ? String(r.location) : null,
            year: r.year != null ? Number(r.year) : y,
          }))
          .filter((s) => !s.year || s.year === y);

      const mapDb = (data: any[], y: number): ApiSession[] =>
        data
          .map((r) => ({
            session_key: Number(r.session_key),
            session_name:
              r.session_name != null ? String(r.session_name) : "Race",
            session_type:
              r.session_type != null ? String(r.session_type) : "Race",
            date_start: r.date_start != null ? String(r.date_start) : null,
            meeting_key:
              r.meeting_key != null ? Number(r.meeting_key) : undefined,
            meeting_name:
              r.meeting_name != null
                ? String(r.meeting_name)
                : `Session ${r.session_key}`,
            circuit_short_name:
              r.circuit_short_name != null
                ? String(r.circuit_short_name)
                : null,
            country_name:
              r.country_name != null ? String(r.country_name) : null,
            year: r.year != null ? Number(r.year) : y,
          }))
          .filter((s) => !s.year || s.year === y);

      let dbSessions: ApiSession[] = [];
      try {
        const res = await fetch(`${base}/api/sessions?year=${year}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          dbSessions = mapDb(data, year);
        }
      } catch {
        /* */
      }

      // If year 2026, calendar is backed by official CALENDAR_2026
      if (year === 2026) {
        if (dbSessions.length > 0) {
          setApiSessions(dbSessions);
          setSource("db");
          setHint("Mùa giải 2026 · Đã nạp phiên dữ liệu từ MySQL / MongoDB");
        } else {
          setApiSessions([]);
          setSource("calendar2026");
          setHint("Mùa giải F1 2026 chính thức · 24 chặng đua toàn cầu");
        }
        setApiLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `https://api.openf1.org/v1/sessions?year=${year}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (isLockPayload(data)) {
          if (dbSessions.length > 0) {
            setApiSessions(dbSessions);
            setSource("db");
            setHint(
              "OpenF1 lock (live) — calendar hiển thị các chặng Race đã nạp từ MySQL / MongoDB.",
            );
          } else {
            setHint("OpenF1 đang khóa live — hiển thị lịch local.");
          }
          setApiLoading(false);
          return;
        }
        if (Array.isArray(data) && data.length > 0) {
          setApiSessions(mapOf1(data, year));
          setSource("openf1");
          setHint(
            dbSessions.length > 0
              ? `Lịch OpenF1 đầy đủ (FP/Sprint/Quali/Race) · MySQL ${dbSessions.length} Race đã lưu trữ`
              : "Lịch OpenF1 đầy đủ (FP/Sprint/Quali/Race)",
          );
          setApiLoading(false);
          return;
        }
      } catch {
        if (!cancelled) {
          setHint("OpenF1 tải chậm — sử dụng dữ liệu lưu trữ.");
        }
      }

      if (cancelled) return;
      if (dbSessions.length > 0) {
        setApiSessions(dbSessions);
        setSource("db");
      } else {
        setApiSessions([]);
        setSource("none");
      }
      setApiLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [year]);

  const groups: MeetingGroup[] = useMemo(() => {
    // 1. Season 2026: Official 24 Grand Prix schedule
    if (year === 2026 && apiSessions.length === 0) {
      return CALENDAR_2026.map((race) => {
        const isBaku = race.circuit_short_name.toLowerCase().includes("baku");
        const key = isBaku ? BAKU_RACE_KEY : 11400 + race.round;
        return {
          meeting_key: 1000 + race.round,
          round: race.round,
          title: race.meeting_name.replace(" Grand Prix", ""),
          circuit: race.circuit_short_name,
          country: race.country_name,
          date: race.date_start.slice(0, 10),
          rawDateStart: race.date_start,
          hasBigData: isBaku,
          sessions: [
            {
              session_key: key,
              session_name: "Race",
              session_type: "Race",
              meeting_name: race.meeting_name,
              circuit_short_name: race.circuit_short_name,
              country_name: race.country_name,
              date_start: race.date_start,
              year: 2026,
            },
          ],
        };
      });
    }

    // 2. From apiSessions (OpenF1 / DB)
    if (apiSessions.length > 0) {
      const map = new Map<number, MeetingGroup>();
      for (const s of apiSessions) {
        const mk = s.meeting_key ?? s.session_key;
        let g = map.get(mk);
        if (!g) {
          g = {
            meeting_key: mk,
            title:
              s.meeting_name?.replace(" Grand Prix", "") ||
              s.location ||
              s.circuit_short_name ||
              `Meeting ${mk}`,
            circuit: s.circuit_short_name || s.location || "—",
            country: s.country_name || "—",
            date: s.date_start ? String(s.date_start).slice(0, 10) : "—",
            rawDateStart: s.date_start,
            hasBigData: s.session_key === 9606 || s.session_key === BAKU_RACE_KEY,
            sessions: [],
          };
          map.set(mk, g);
        }
        g.sessions.push(s);
        if (s.session_key === 9606 || s.session_key === BAKU_RACE_KEY) {
          g.hasBigData = true;
        }
        if (
          s.date_start &&
          (g.date === "—" || s.date_start.slice(0, 10) < g.date)
        ) {
          g.date = s.date_start.slice(0, 10);
          g.rawDateStart = s.date_start;
        }
      }
      for (const g of map.values()) {
        g.sessions.sort(
          (a, b) =>
            sessionSortKey(a.session_name || "") -
            sessionSortKey(b.session_name || "") ||
            (a.date_start || "").localeCompare(b.date_start || ""),
        );
      }
      const sorted = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
      return sorted.map((g, idx) => ({ ...g, round: idx + 1 }));
    }

    // 3. Fallback to meetingsLocal
    return meetingsLocal.map((m) => ({
      meeting_key: m.round,
      round: m.round,
      title: m.meeting_name.replace(" Grand Prix", ""),
      circuit: m.circuit_short_name,
      country: m.country_name,
      date: m.date_start.slice(0, 10),
      rawDateStart: m.date_start,
      hasBigData: m.session_key === 9606 || m.session_key === SESSION_KEY,
      sessions: [
        {
          session_key: m.session_key,
          session_name: "Race",
          session_type: "Race",
          meeting_name: m.meeting_name,
          circuit_short_name: m.circuit_short_name,
          country_name: m.country_name,
          date_start: m.date_start,
          year: m.year,
        },
      ],
    }));
  }, [year, apiSessions, meetingsLocal]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 sm:px-4">
      {/* Year Selector Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {[2026, 2025, 2024, 2023].map((y) => (
          <Button
            key={y}
            size="sm"
            variant={year === y ? "default" : "secondary"}
            onClick={() => setYear(y)}
            className={cn(
              "font-bold transition-all",
              y === 2026 && year === 2026 && "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30",
              y === 2026 && year !== 2026 && "border border-red-500/40 text-red-300 hover:text-white hover:bg-red-500/20",
            )}
          >
            {y === 2026 ? "2026 (Live Season)" : y}
          </Button>
        ))}
        {seasons
          .filter((s) => ![2023, 2024, 2025, 2026].includes(s.year))
          .map((s) => (
            <Button
              key={s.year}
              size="sm"
              variant={year === s.year ? "default" : "secondary"}
              onClick={() => setYear(s.year)}
            >
              {s.year}
            </Button>
          ))}
        <span className="ml-auto text-xs tracking-wider text-muted uppercase">
          {standingsLoading
            ? "Đang tải điểm…"
            : year === 2026
              ? `F1 2026 · ${groups.length} chặng đua`
              : source === "openf1"
                ? `OpenF1 · ${apiSessions.length} phiên`
                : source === "db"
                  ? `MySQL · ${apiSessions.length} phiên`
                  : apiLoading
                    ? "Đang nạp…"
                    : "Lịch thi đấu"}
        </span>
      </div>

      {(hint || standingsHint) && (
        <p className="rounded-md bg-surface-2 border border-border px-3 py-2 text-xs text-muted flex items-center justify-between">
          <span>{[hint, standingsHint].filter(Boolean).join(" · ")}</span>
          <span className="font-mono text-[11px] text-cyan-400">Múi giờ: {userTz}</span>
        </p>
      )}

      {/* Top 2026 Countdown Banner when viewing 2026 */}
      {year === 2026 && (
        <div className="mb-1">
          <LiveCountdownBanner />
        </div>
      )}

      {leader && year !== 2026 && (
        <div className="panel flex items-center gap-3 px-3 py-3">
          <Trophy className="size-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs tracking-widest text-muted uppercase">
              {year} Vô địch Thế giới (WDC Leader)
            </p>
            <p className="truncate text-xl font-extrabold tracking-wide uppercase">
              {splitName(leader.full_name).last}
              <span className="ml-2 font-mono text-base font-semibold text-muted">
                {leader.points} pts
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1">
        <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")}>
          Lịch Chặng Đua (Calendar)
        </TabBtn>
        <TabBtn active={tab === "drivers"} onClick={() => setTab("drivers")}>
          Bảng Điểm Tay Đua (Drivers)
        </TabBtn>
        <TabBtn
          active={tab === "constructors"}
          onClick={() => setTab("constructors")}
        >
          Bảng Điểm Đội Đua (Teams)
        </TabBtn>
      </div>

      <div className="panel min-h-0 flex-1 overflow-y-auto">
        {/* TAB CALENDAR - EASY TO CLICK GRAND PRIX CARDS */}
        {tab === "calendar" && (
          <div className="p-3">
            {apiLoading && groups.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">Đang tải lịch thi đấu…</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {groups.map((g) => {
                const flag = getCountryFlag(g.country);
                const primaryRace =
                  g.sessions.find((s) => /race/i.test(s.session_name || "")) ||
                  g.sessions[g.sessions.length - 1];

                const isOngoingOrLive =
                  g.sessions.some((s) => s.session_key === BAKU_RACE_KEY || s.session_key === 9606);

                return (
                  <div
                    key={g.meeting_key}
                    onClick={() => {
                      if (primaryRace) openSession(primaryRace.session_key);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (primaryRace) openSession(primaryRace.session_key);
                      }
                    }}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-xl border border-border/80 bg-surface/90 p-4 transition-all duration-200 hover:border-red-500/70 hover:bg-surface-2 hover:shadow-lg cursor-pointer select-none overflow-hidden",
                      isOngoingOrLive && "ring-1 ring-red-500/50 bg-gradient-to-br from-red-500/[0.04] to-surface",
                    )}
                  >
                    {/* Top Row: Round badge, Country Flag, Title, Big Data Badge */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-2 border border-border text-muted group-hover:text-red-400 group-hover:border-red-500/40 transition-colors shrink-0">
                            R{String(g.round ?? 1).padStart(2, "0")}
                          </span>
                          <span className="text-2xl select-none" role="img" aria-label={g.country}>
                            {flag}
                          </span>
                          <h4 className="truncate text-base font-extrabold tracking-wide uppercase text-fg group-hover:text-red-400 transition-colors">
                            {g.title} GP
                          </h4>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {g.hasBigData && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <Zap className="size-3" />
                              <span>Big Data (Ổ D:)</span>
                            </span>
                          )}
                          <Badge variant="muted" className="text-[10px] uppercase">
                            {g.country}
                          </Badge>
                        </div>
                      </div>

                      {/* Middle Row: Track info & User Timezone */}
                      <div className="space-y-1 my-2">
                        <p className="flex items-center gap-1.5 text-xs text-subtle truncate">
                          <MapPin className="size-3 text-red-500 shrink-0" />
                          <span className="truncate">{g.circuit} · {g.country}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted truncate">
                          <Calendar className="size-3 text-cyan-400 shrink-0" />
                          <span className="font-mono text-[11px] text-fg">
                            {formatWithUserTimezone(g.rawDateStart || g.date)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: Granular Session Pills + Big Watch Button */}
                    <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                      <div
                        className="flex flex-wrap items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {g.sessions.map((s) => {
                          const label = s.session_name || s.session_type || "Session";
                          const isRace = /race/i.test(label);
                          return (
                            <Button
                              key={s.session_key}
                              size="sm"
                              variant={isRace ? "secondary" : "outline"}
                              className={cn(
                                "h-7 text-xs px-2.5 font-medium transition-colors",
                                isRace && "hover:bg-red-600 hover:text-white font-bold",
                              )}
                              onClick={() => openSession(s.session_key)}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 px-3.5 gap-1.5 font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-sm transition-transform group-hover:scale-105"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (primaryRace) openSession(primaryRace.session_key);
                        }}
                      >
                        <Play className="size-3.5 fill-white" />
                        <span>Xem Chặng</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB DRIVERS */}
        {tab === "drivers" && (
          <>
            {standingsLoading && (
              <p className="px-3 py-4 text-sm text-muted">
                Đang tải bảng điểm FIA…
              </p>
            )}
            {!standingsLoading && drivers.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">
                {year === 2026
                  ? "Mùa giải 2026 sắp diễn ra — dữ liệu điểm số sẽ cập nhật theo từng chặng đua."
                  : `Chưa có bảng điểm năm ${year}.`}
              </p>
            )}
            {drivers.length > 0 && (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-xs tracking-widest text-subtle uppercase">
                    <th className="px-3 py-2 font-medium">P</th>
                    <th className="px-1 py-2 font-medium">Driver</th>
                    <th className="hidden px-1 py-2 font-medium sm:table-cell">
                      Team
                    </th>
                    <th className="px-2 py-2 font-medium text-right">Wins</th>
                    <th className="px-3 py-2 font-medium text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.driver_number} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-sm tabular text-muted">
                        {d.position}
                      </td>
                      <td className="px-1 py-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="flex size-6 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-semibold"
                            style={{
                              backgroundColor: teamHex(d.team_colour),
                              color: onTeam(d.team_colour),
                            }}
                          >
                            {d.driver_number}
                          </span>
                          <span className="font-bold tracking-wide uppercase">
                            {splitName(d.full_name).last}
                          </span>
                        </span>
                      </td>
                      <td className="hidden truncate px-1 py-2 text-sm text-muted sm:table-cell">
                        {d.team_name}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-sm tabular">
                        {d.wins}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-semibold tabular">
                        {d.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* TAB CONSTRUCTORS */}
        {tab === "constructors" && (
          <>
            {standingsLoading && (
              <p className="px-3 py-4 text-sm text-muted">Đang tải bảng điểm đội…</p>
            )}
            {!standingsLoading && teams.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">
                {year === 2026
                  ? "Mùa giải 2026 sắp diễn ra — bảng điểm đội đua sẽ cập nhật trực tiếp."
                  : `Chưa có bảng điểm đội năm ${year}.`}
              </p>
            )}
            {teams.length > 0 && (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-xs tracking-widest text-subtle uppercase">
                    <th className="px-3 py-2 font-medium">P</th>
                    <th className="px-1 py-2 font-medium">Team</th>
                    <th className="px-2 py-2 font-medium text-right">Wins</th>
                    <th className="px-3 py-2 font-medium text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((tm) => (
                    <tr key={tm.team_name} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-sm tabular text-muted">
                        {tm.position}
                      </td>
                      <td className="px-1 py-2 font-bold tracking-wide uppercase">
                        {tm.team_name}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-sm tabular">
                        {tm.wins}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-semibold tabular">
                        {tm.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      className="flex-1 sm:flex-none"
    >
      {children}
    </Button>
  );
}
