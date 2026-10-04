import { useEffect, useMemo, useState } from "react";
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
  location?: string | null;
  year?: number | null;
};

type MeetingGroup = {
  meeting_key: number;
  title: string;
  circuit: string;
  country: string;
  date: string;
  sessions: ApiSession[];
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

export function ArchiveView() {
  const year = usePitwall((s) => s.year);
  const setYear = usePitwall((s) => s.setYear);
  const tab = usePitwall((s) => s.standingsTab);
  const setTab = usePitwall((s) => s.setStandingsTab);
  const openSession = usePitwall((s) => s.setSessionKey);
  const seasons = Get_Seasons();
  const meetingsLocal = Get_Season_Meetings(year);
  const drivers = Get_Driver_Standings(year);
  const teams = Get_Constructor_Standings(year);
  const leader = drivers[0];

  const [apiSessions, setApiSessions] = useState<ApiSession[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [source, setSource] = useState<"openf1" | "db" | "none">("none");
  const [hint, setHint] = useState("");

  useEffect(() => {
    let cancelled = false;
    setApiLoading(true);
    setHint("");

    (async () => {
      const base =
        import.meta.env.VITE_API_URL ||
        "https://f1-dashboard-sbrl.onrender.com";

      // 1) MySQL trước (hoạt động khi OpenF1 lock)
      try {
        const res = await fetch(`${base}/api/sessions?year=${year}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((r: Record<string, unknown>) => ({
            session_key: Number(r.session_key),
            session_name:
              r.session_name != null ? String(r.session_name) : "Race",
            session_type:
              r.session_type != null ? String(r.session_type) : "Race",
            date_start: r.date_start != null ? String(r.date_start) : null,
            meeting_key:
              r.meeting_key != null ? Number(r.meeting_key) : undefined,
            meeting_name:
              r.meeting_name != null ? String(r.meeting_name) : null,
            circuit_short_name:
              r.circuit_short_name != null
                ? String(r.circuit_short_name)
                : null,
            country_name:
              r.country_name != null ? String(r.country_name) : null,
            year: r.year != null ? Number(r.year) : year,
          }));
          // Chỉ key thuần → gắn nhãn Race
          const normalized = mapped.map((s) =>
            s.meeting_name
              ? s
              : {
                  ...s,
                  session_name: s.session_name || "Race",
                  meeting_name: `Session ${s.session_key}`,
                },
          );
          setApiSessions(normalized);
          setSource("db");
          setApiLoading(false);
          // Vẫn thử OpenF1 để bổ sung FP nếu không lock
        }
      } catch {
        /* fall through */
      }

      // 2) OpenF1 full calendar (khi không lock)
      try {
        const res = await fetch(
          `https://api.openf1.org/v1/sessions?year=${year}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (isLockPayload(data)) {
          setHint(
            "OpenF1 đang khóa vì có session live — calendar lấy từ MySQL (chặng đã pump).",
          );
          setApiLoading(false);
          return;
        }
        if (Array.isArray(data) && data.length > 0) {
          setApiSessions(
            data.map((r: Record<string, unknown>) => ({
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
              year: r.year != null ? Number(r.year) : year,
            })),
          );
          setSource("openf1");
          setHint("");
        }
      } catch {
        if (!cancelled) {
          setHint("Không gọi được OpenF1 — dùng MySQL / local.");
        }
      }

      if (!cancelled) setApiLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [year]);

  const groups: MeetingGroup[] = useMemo(() => {
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
          sessions: [],
        };
        map.set(mk, g);
      }
      g.sessions.push(s);
      if (
        s.date_start &&
        (g.date === "—" || s.date_start.slice(0, 10) < g.date)
      ) {
        g.date = s.date_start.slice(0, 10);
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
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [apiSessions]);

  const useApiCalendar = groups.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        {[2023, 2024, 2025, 2026].map((y) => (
          <Button
            key={y}
            size="sm"
            variant={year === y ? "default" : "secondary"}
            onClick={() => setYear(y)}
          >
            {y}
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
          {source === "openf1"
            ? `OpenF1 · ${apiSessions.length} sessions`
            : source === "db"
              ? `MySQL · ${apiSessions.length} sessions`
              : apiLoading
                ? "Loading…"
                : "Local"}
        </span>
      </div>

      {hint && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
          {hint}
        </p>
      )}

      {leader && !useApiCalendar && (
        <div className="panel flex items-center gap-3 px-3 py-3">
          <Trophy className="size-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs tracking-widest text-muted uppercase">
              {year} Drivers
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

      <div className="flex gap-1">
        <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")}>
          Calendar
        </TabBtn>
        <TabBtn active={tab === "drivers"} onClick={() => setTab("drivers")}>
          Drivers
        </TabBtn>
        <TabBtn
          active={tab === "constructors"}
          onClick={() => setTab("constructors")}
        >
          Teams
        </TabBtn>
      </div>

      <div className="panel min-h-0 flex-1 overflow-y-auto">
        {tab === "calendar" && useApiCalendar && (
          <div className="divide-y divide-border">
            {groups.map((g, gi) => (
              <div key={g.meeting_key} className="px-3 py-3">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="font-mono text-xs text-muted">
                    R{String(gi + 1).padStart(2, "0")}
                  </span>
                  <span className="text-base font-bold tracking-wide uppercase">
                    {g.title}
                  </span>
                  <span className="truncate text-xs text-subtle">
                    {g.circuit} · {g.date}
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {g.sessions.map((s) => {
                    const label = s.session_name || s.session_type || "Session";
                    const isRace = /race/i.test(label);
                    return (
                      <li
                        key={s.session_key}
                        className="flex items-center gap-2 rounded-md bg-surface-2/60 px-2 py-1.5"
                      >
                        <Badge variant={isRace ? "live" : "muted"}>{label}</Badge>
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-subtle">
                          key {s.session_key}
                        </span>
                        <Button
                          size="sm"
                          variant={isRace ? "default" : "secondary"}
                          className="h-9 shrink-0 gap-1 px-2.5"
                          onClick={() => openSession(s.session_key)}
                        >
                          <Play className="size-3.5" />
                          Watch
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {tab === "calendar" && !useApiCalendar && (
          <>
            {apiLoading && (
              <p className="px-3 py-4 text-sm text-muted">Loading calendar…</p>
            )}
            <ol className="divide-y divide-border">
              {meetingsLocal.map((m) => {
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
                      {watchable && (
                        <Button
                          size="sm"
                          variant={isLive ? "default" : "secondary"}
                          className="h-11 min-w-11 shrink-0 gap-1.5 px-3"
                          onClick={() => openSession(m.session_key)}
                        >
                          <Play className="size-3.5" />
                          Watch
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
                  <td className="px-1 py-2 font-bold tracking-wide uppercase">
                    {t.team_name}
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
