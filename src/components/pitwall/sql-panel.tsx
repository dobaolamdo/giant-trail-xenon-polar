import { useMemo, type ReactNode } from "react";
import type { LapHistoryRow, LeaderboardRow } from "@/lib/f1/types";
import { cn } from "@/lib/utils";

type Props = {
  sessionKey: number;
  selected: number;
  currentLap: number;
  maxLap: number;
  driverLaps: LapHistoryRow[];
  board: LeaderboardRow[];
  canReplay: boolean;
};

/** Demo CSDL: RAW → TRIGGER → PROCEDURE — hiện rõ khi Play. */
export function SqlPanel({
  sessionKey,
  selected,
  currentLap,
  maxLap,
  driverLaps,
  board,
  canReplay,
}: Props) {
  const last = driverLaps[driverLaps.length - 1];

  const purpleLog = useMemo(() => {
    const events: string[] = [];
    for (const l of driverLaps) {
      if (l.is_purple_s1)
        events.push(
          `L${l.lap_number} · #${selected} · S1 ${l.duration_sector_1.toFixed(3)}s → is_purple_s1=1`,
        );
      if (l.is_purple_s2)
        events.push(
          `L${l.lap_number} · #${selected} · S2 ${l.duration_sector_2.toFixed(3)}s → is_purple_s2=1`,
        );
      if (l.is_purple_s3)
        events.push(
          `L${l.lap_number} · #${selected} · S3 ${l.duration_sector_3.toFixed(3)}s → is_purple_s3=1`,
        );
      if (l.is_personal_best)
        events.push(
          `L${l.lap_number} · #${selected} · LAP ${l.lap_duration.toFixed(3)}s → personal best`,
        );
    }
    return events.slice(-8);
  }, [driverLaps, selected]);

  const top3 = board.slice(0, 3);

  return (
    <div className="h-full space-y-3 overflow-y-auto p-3 text-[11px] leading-relaxed">
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
        <Pipe active>RAW INSERT</Pipe>
        <span className="text-muted">→</span>
        <Pipe active={purpleLog.length > 0} purple>
          TRIGGER
        </Pipe>
        <span className="text-muted">→</span>
        <Pipe active={board.length > 0}>PROCEDURE</Pipe>
        <span className="text-muted">→</span>
        <Pipe active={board.length > 0}>UI</Pipe>
      </div>

      <p className="text-xs text-muted">
        Session <span className="font-mono text-fg">{sessionKey}</span>
        {canReplay ? (
          <>
            {" · "}
            <span className="font-mono text-fg">
              L{currentLap}/{maxLap}
            </span>
          </>
        ) : null}{" "}
        — Play để thấy trigger fire.
      </p>

      <Section title="1 · RAW ingest (OpenF1 → laps)">
        <pre className="overflow-x-auto rounded bg-surface-2 p-2 font-mono text-fg">
          {last
            ? `INSERT INTO laps (session_key, driver_number, lap_number,
  lap_duration, duration_sector_1, duration_sector_2, duration_sector_3)
VALUES (${sessionKey}, ${selected}, ${last.lap_number},
  ${last.lap_duration.toFixed(3)}, ${last.duration_sector_1.toFixed(3)},
  ${last.duration_sector_2.toFixed(3)}, ${last.duration_sector_3.toFixed(3)});`
            : canReplay
              ? "-- Bấm Play: mỗi vòng = 1 INSERT"
              : "-- Chưa có lap trong MySQL"}
        </pre>
        {last && (
          <pre className="mt-1 overflow-x-auto rounded border border-border/50 bg-bg/40 p-2 font-mono text-muted">
            {JSON.stringify(
              {
                driver: selected,
                lap: last.lap_number,
                s1: last.duration_sector_1,
                s2: last.duration_sector_2,
                s3: last.duration_sector_3,
              },
              null,
              2,
            )}
          </pre>
        )}
      </Section>

      <Section title="2 · TRIGGER (AFTER INSERT on laps)">
        <pre className="overflow-x-auto rounded bg-surface-2 p-2 font-mono text-[10px] text-fg">
          {`CREATE TRIGGER trg_laps_session_best
AFTER INSERT ON laps FOR EACH ROW
BEGIN
  IF NEW.duration_sector_1 < (
    SELECT MIN(duration_sector_1) FROM laps
    WHERE session_key = NEW.session_key
      AND lap_number < NEW.lap_number
  ) THEN
    UPDATE laps SET is_purple_s1 = 1
    WHERE id = NEW.id;
  END IF;
  -- tương tự S2, S3, lap
END;`}
        </pre>
        <div className="mt-2">
          <p className="mb-1 text-[10px] tracking-widest text-violet-300 uppercase">
            Trigger log (session-best)
          </p>
          {purpleLog.length === 0 ? (
            <p className="text-muted">
              No session-best yet — Play to advance.
            </p>
          ) : (
            <ul className="space-y-1">
              {purpleLog.map((e, i) => (
                <li
                  key={i}
                  className="rounded bg-violet-500/10 px-2 py-1 font-mono text-violet-300 ring-1 ring-violet-500/30"
                >
                  🟣 {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="3 · PROCEDURE → leaderboard">
        <pre className="overflow-x-auto rounded bg-surface-2 p-2 font-mono text-[10px] text-fg">
          {`CALL Get_Live_Leaderboard(${sessionKey});
-- xếp hạng: số vòng DESC, tổng thời gian ASC
-- DNF / ít vòng hơn → xuống cuối`}
        </pre>
        {top3.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[10px] tracking-widest text-muted uppercase">
              Derived top 3 @ L{currentLap || "—"}
            </p>
            {top3.map((r) => (
              <div
                key={r.driver_number}
                className="flex justify-between gap-2 rounded bg-surface-2 px-2 py-1 font-mono"
              >
                <span className="text-fg">
                  P{r.live_rank} #{r.driver_number}{" "}
                  {(r.code || r.full_name.split(" ").pop() || "").toUpperCase()}
                </span>
                <span className="text-muted">
                  {r.live_rank === 1
                    ? "Leader"
                    : r.gap_to_leader != null
                      ? `+${r.gap_to_leader.toFixed(3)}`
                      : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <p className="border-t border-border pt-2 text-[10px] text-muted">
        Tab Schema: ERD · full trigger/procedure DDL. Môn CSDL: RAW nghèo →
        TRIGGER gắn cờ → PROCEDURE tính xếp hạng.
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold tracking-widest text-muted uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function Pipe({
  children,
  active,
  purple,
}: {
  children: string;
  active?: boolean;
  purple?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 tracking-wide",
        purple && active
          ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40"
          : active
            ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
            : "bg-surface-2 text-muted",
      )}
    >
      {children}
    </span>
  );
}
