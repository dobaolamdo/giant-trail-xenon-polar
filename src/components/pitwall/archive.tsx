import { useEffect, useState } from "react";
import { Play, Trophy } from "lucide-react";
import {
  Get_Constructor_Standings,
  Get_Driver_Standings,
  Get_Season_Meetings,
  Get_Seasons,
  SESSION_KEY,
} from "@/lib/f1/api";
import { usePitwall } from "@/lib/f1/store";
import { splitName } from "@/lib/f1/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, onTeam, teamHex } from "@/lib/utils";

type ApiSession = {
  session_key: number;
  session_name?: string;
  session_type?: string;
  date_start?: string | null;
  meeting_key?: number;
  meeting_name?: string | null;
  circuit_short_name?: string | null;
  country_name?: string | null;
  year?: number | null;
};

export function ArchiveView() {
  const year = usePitwall((s) => s.year);
  const setYear = usePitwall((s) => s.setYear);
  const tab = usePitwall((s) => s.standingsTab);
  const setTab = usePitwall((s) => s.setStandingsTab);
  const openSession = usePitwall((s) => s.setSessionKey);
  const seasons = Get_Seasons();
  const meetings = Get_Season_Meetings(year);
  const drivers = Get_Driver_Standings(year);
  const teams = Get_Constructor_Standings(year);
  const leader = drivers[0];

  const [apiSessions, setApiSessions] = useState<ApiSession[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    const base =
      import.meta.env.VITE_API_URL || "https://f1-dashboard-sbrl.onrender.com";
    let cancelled = false;
    setApiLoading(true);
    (async () => {
      try {
        const res = await fetch(`${base}/api/sessions?year=${year}`);
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        setApiSessions(
          data.map((r: Record<string, unknown>) => ({
            session_key: Number(r.session_key),
            session_name: r.session_name != null ? String(r.session_name) : undefined,
            session_type: r.session_type != null ? String(r.session_type) : undefined,
            date_start: r.date_start != null ? String(r.date_start) : null,
            meeting_key: r.meeting_key != null ? Number(r.meeting_key) : undefined,
            meeting_name: r.meeting_name != null ? String(r.meeting_name) : null,
            circuit_short_name:
              r.circuit_short_name != null ? String(r.circuit_short_name) : null,
            country_name: r.country_name != null ? String(r.country_name) : null,
            year: r.year != null ? Number(r.year) : null,
          })),
        );
      } catch {
        if (!cancelled) setApiSessions([]);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const useApiCalendar = apiSessions.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        {seasons.map((s) => (
          <Button
            key={s.year}
            size="sm"
            variant={year === s.year ? "default" : "secondary"}
            onClick={() => setYear(s.year)}
          >
            {s.year}
          </Button>
        ))}
        <Button
          size="sm"
          variant={year === 2024 ? "default" : "secondary"}
          onClick={() => setYear(2024)}
        >
          2024
        </Button>
        <span className="ml-auto text-xs tracking-wider text-muted uppercase">
          {useApiCalendar
            ? `OpenF1 · ${apiSessions.length} sessions in DB`
            : year === 2026
              ? "In progress · local archive"
              : "Local / final standings"}
        </span>
      </div>

      {leader && (
        <div className="panel flex items-center gap-3 px-3 py-3">
          <Trophy className="size-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs tracking-widest text-muted uppercase">
              {year === 2026 ? `${year} Drivers leader` : `${year} Drivers champion`}
            </p>
            <p className="truncate text-xl font-extrabold tracking-wide uppercase">
              {splitName(leader.full_name).last}
              <span className="ml-2 font-mono text-base font-semibold text-muted">
                {leader.points} pts
              </span>
            </p>
          </div>
          <span
            className="ml-auto hidden rounded-sm px-2 py-1 text-xs font-semibold tracking-wide uppercase sm:inline"
            style={{
              backgroundColor: teamHex(leader.team_colour),
              color: onTeam(leader.team_colour),
            }}
          >
            {leader.team_name}
          </span>
        </div>
      )}

      <div className="flex gap-1">
        <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")}>
          Calendar
        </TabBtn>
        <TabBtn active={tab === "drivers"} onClick={() => setTab("drivers")}>
          Drivers
        </TabBtn>
        <TabBtn active={tab === "constructors"} onClick={() => setTab("constructors")}>
          Teams
        </TabBtn>
      </div>

      <div className="panel min-h-0 flex-1 overflow-y-auto">
        {tab === "calendar" && useApiCalendar && (
          <ol className="divide-y divide-border">
            {apiSessions.map((m, i) => {
              const title =
                m.meeting_name?.replace(" Grand Prix", "") ||
                m.circuit_short_name ||
                `Session ${m.session_key}`;
              return (
                <li key={m.session_key}>
                  <div className="flex w-full items-center gap-3 px-3 py-2.5">
                    <span className="w-8 shrink-0 font-mono text-sm tabular text-muted">
                      R{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold tracking-wide uppercase">
                        {title}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        {(m.circuit_short_name || m.country_name || "—") +
                          " · " +
                          (m.date_start ? String(m.date_start).slice(0, 10) : "—") +
                          " · key " +
                          m.session_key}
                      </span>
                    </span>
                    <Badge variant="muted">DB</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 min-w-11 shrink-0 gap-1.5 px-3"
                      onClick={() => openSession(m.session_key)}
                      aria-label={`Watch ${title}`}
                    >
                      <Play className="size-3.5" />
                      <span className="hidden sm:inline">Watch</span>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {tab === "calendar" && !useApiCalendar && (
          <>
            {apiLoading && (
              <p className="px-3 py-4 text-sm text-muted">Loading sessions from API…</p>
            )}
            <ol className="divide-y divide-border">
              {meetings.map((m) => {
                const watchable = m.status !== "upcoming";
                const isLive = m.session_key === SESSION_KEY;
                return (
                  <li key={m.session_key}>
                    <div
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5",
                        !watchable && "opacity-45",
                      )}
                    >
                      <span className="w-8 shrink-0 font-mono text-sm tabular text-muted">
                        R{String(m.round).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold tracking-wide uppercase">
                          {m.meeting_name.replace(" Grand Prix", "")}
                        </span>
                        <span className="block truncate text-xs text-subtle">
                          {m.circuit_short_name} · {m.date_start.slice(0, 10)}
                        </span>
                      </span>
                      <StatusChip status={m.status} />
                      {watchable && (
                        <Button
                          size="sm"
                          variant={isLive ? "default" : "secondary"}
                          className="h-11 min-w-11 shrink-0 gap-1.5 px-3"
                          onClick={() => openSession(m.session_key)}
                        >
                          <Play className="size-3.5" />
                          <span className="hidden sm:inline">
                            {isLive ? "Live" : "Watch"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {tab === "drivers" && (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-xs tracking-widest text-subtle uppercase">
                <th className="px-3 py-2 font-medium">P</th>
                <th className="px-1 py-2 font-medium">Driver</th>
                <th className="hidden px-1 py-2 font-medium sm:table-cell">Team</th>
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

        {tab === "constructors" && (
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
              {teams.map((t) => (
                <tr key={t.team_name} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-sm tabular text-muted">
                    {t.position}
                  </td>
                  <td className="px-1 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: teamHex(t.team_colour) }}
                      />
                      <span className="font-bold tracking-wide uppercase">
                        {t.team_name}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm tabular">
                    {t.wins}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm font-semibold tabular">
                    {t.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="px-1 text-xs tracking-wide text-subtle">
        2024 sessions from Aiven (/api/sessions) · Watch → Get_Live_Leaderboard
      </p>
    </div>
  );
}

function StatusChip({ status }: { status: "live" | "complete" | "upcoming" }) {
  if (status === "live") return <Badge variant="live">Live</Badge>;
  if (status === "complete") return <Badge variant="muted">Replay</Badge>;
  return <Badge variant="outline">Soon</Badge>;
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
