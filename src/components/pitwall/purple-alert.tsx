import { useEffect, useRef, useState } from "react";
import { Get_Derived_Events, Get_Session_Bests, type DerivedEvent } from "@/lib/f1/derive";
import { formatLapTime, formatSector, splitName } from "@/lib/f1/format";
import { useRaceClock } from "@/lib/f1/clock";
import { usePitwall } from "@/lib/f1/store";
import { hasTimingFeed, getFeed } from "@/lib/f1/api";
import { cn, teamHex } from "@/lib/utils";

export function PurpleAlert() {
  const elapsed = useRaceClock((s) => s.elapsed);
  const sessionKey = usePitwall((s) => s.sessionKey);
  const live = hasTimingFeed(sessionKey);
  const feed = getFeed(sessionKey);
  const events = live ? Get_Derived_Events(sessionKey, elapsed) : [];
  const latest = events[events.length - 1];
  const seen = useRef<string>("");
  const lastT = useRef(elapsed);
  const [burst, setBurst] = useState<DerivedEvent | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (elapsed + 0.5 < lastT.current) seen.current = "";
    lastT.current = elapsed;
    if (!latest) return;
    if (seen.current === latest.id) return;
    const first = seen.current === "";
    seen.current = latest.id;
    if (first) return;
    setBurst(latest);
    setFlashKey((k) => k + 1);
    const id = window.setTimeout(() => setBurst(null), 2800);
    return () => window.clearTimeout(id);
  }, [latest, elapsed]);

  const bests = live ? Get_Session_Bests(sessionKey, elapsed) : null;
  const hotKind = burst?.kind;

  if (!live) return null;

  return (
    <>
      {burst && (
        <div
          key={flashKey}
          className="purple-burst pointer-events-none fixed top-16 right-0 left-0 z-40 flex justify-center px-3 sm:top-20"
          role="status"
        >
          <div className="flex max-w-xl items-center gap-3 rounded-lg bg-[#1a1024] px-4 py-3 shadow-[0_0_40px_rgb(192_132_252_/_0.45)]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sector-purple font-extrabold text-[#1a1024]">
              {burst.kind}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.2em] text-sector-purple uppercase">
                Trigger · new fastest {burst.kind === "LAP" ? "lap" : `sector ${burst.kind.slice(1)}`}
              </p>
              <p className="truncate text-lg font-extrabold tracking-wide text-fg uppercase">
                {splitName(burst.full_name).last}
                <span className="ml-2 font-mono text-base font-semibold text-sector-purple">
                  {burst.kind === "LAP" ? formatLapTime(burst.value) : formatSector(burst.value)}
                </span>
              </p>
              <p className="text-xs text-muted">
                {burst.beaten != null
                  ? `beats ${burst.beaten_code}  ${burst.kind === "LAP" ? formatLapTime(burst.beaten) : formatSector(burst.beaten)}`
                  : "session opener"}
                <span className="ml-2 tracking-wider text-subtle uppercase">lap {burst.lap_number}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {bests && (
        <div className="px-3 pb-2 sm:px-4">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface px-2 py-1.5 shadow-[var(--shadow-border)]">
            <span className="px-1.5 text-xs tracking-widest text-subtle uppercase">Session best</span>
            {(["S1", "S2", "S3", "LAP"] as const).map((kind) => {
              const b = bests[kind];
              const hot = hotKind === kind;
              return (
                <span
                  key={kind}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs tabular",
                    hot ? "best-pulse bg-sector-purple/20 text-sector-purple" : "bg-surface-2 text-fg",
                  )}
                >
                  <span className="text-subtle">{kind}</span>
                  {b ? (
                    <>
                      <span
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor: teamHex(
                            feed?.driverByNumber.get(b.driver_number)?.team_colour ?? "888888",
                          ),
                        }}
                      />
                      <span className="font-semibold">
                        {kind === "LAP" ? formatLapTime(b.value) : formatSector(b.value)}
                      </span>
                      <span className="text-muted">{b.code}</span>
                    </>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

