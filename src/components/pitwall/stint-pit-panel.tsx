import { useMemo } from "react";
import type { Pit, Stint } from "@/lib/f1/stints-pits";
import type { RankDriverMeta } from "@/lib/f1/rank";
import { TyreCompound } from "./tyre";
import { cn } from "@/lib/utils";

type Props = {
  stints: Stint[];
  pits: Pit[];
  selected: number;
  currentLap: number;
  meta: Map<number, RankDriverMeta>;
  /** all = full session; selected = only selected driver */
  scope?: "selected" | "all";
};

function codeOf(
  meta: Map<number, RankDriverMeta>,
  n: number,
): string {
  const m = meta.get(n);
  return (m?.code || m?.full_name?.split(" ").pop() || `#${n}`).toUpperCase();
}

export function StintPitPanel({
  stints,
  pits,
  selected,
  currentLap,
  meta,
  scope = "selected",
}: Props) {
  const driverStints = useMemo(() => {
    const list =
      scope === "all"
        ? [...stints]
        : stints.filter((s) => s.driver_number === selected);
    return list.sort(
      (a, b) =>
        a.driver_number - b.driver_number || a.lap_start - b.lap_start,
    );
  }, [stints, selected, scope]);

  const driverPits = useMemo(() => {
    const list =
      scope === "all"
        ? [...pits]
        : pits.filter((p) => p.driver_number === selected);
    return list.sort(
      (a, b) =>
        a.driver_number - b.driver_number || a.lap_number - b.lap_number,
    );
  }, [pits, selected, scope]);

  const activeStint = useMemo(() => {
    return stints.find((s) => {
      if (s.driver_number !== selected) return false;
      const end = s.lap_end ?? 9999;
      return currentLap >= s.lap_start && currentLap <= end;
    });
  }, [stints, selected, currentLap]);

  return (
    <div className="h-full space-y-4 overflow-y-auto p-3 text-[11px]">
      {/* Active */}
      <div className="rounded-md border border-border bg-surface-2/50 p-2">
        <p className="mb-1 text-[10px] tracking-widest text-muted uppercase">
          Now · #{selected} · L{currentLap || "—"}
        </p>
        {activeStint ? (
          <div className="flex items-center gap-2">
            <TyreCompound compound={activeStint.compound} size="md" />
            <span className="font-mono text-fg">
              {activeStint.compound} · L{activeStint.lap_start}–
              {activeStint.lap_end ?? "…"}
              <span className="text-muted">
                {" "}
                (
                {(activeStint.lap_end ?? currentLap) -
                  activeStint.lap_start +
                  1}{" "}
                laps)
              </span>
            </span>
          </div>
        ) : (
          <p className="text-muted">Chưa có stint tại vòng này</p>
        )}
      </div>

      {/* Stints */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted uppercase">
          Stints · lốp theo dải vòng
        </p>
        {driverStints.length === 0 ? (
          <p className="text-muted">Không có stint (OpenF1 trống)</p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-[10px] text-muted">
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Lốp</th>
                  <th className="px-2 py-1.5">Vòng</th>
                  <th className="px-2 py-1.5">Số vòng</th>
                </tr>
              </thead>
              <tbody>
                {driverStints.map((s, i) => {
                  const end = s.lap_end ?? currentLap || s.lap_start;
                  const nLaps = Math.max(1, end - s.lap_start + 1);
                  const active =
                    s.driver_number === selected &&
                    currentLap >= s.lap_start &&
                    currentLap <= (s.lap_end ?? 9999);
                  return (
                    <tr
                      key={`${s.driver_number}-${s.lap_start}-${i}`}
                      className={cn(
                        "border-b border-border/60",
                        active && "bg-emerald-500/10",
                      )}
                    >
                      <td className="px-2 py-1.5 text-fg">
                        {codeOf(meta, s.driver_number)}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <TyreCompound compound={s.compound} />
                          <span className="text-fg">{s.compound}</span>
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-muted tabular">
                        L{s.lap_start}–{s.lap_end ?? "…"}
                      </td>
                      <td className="px-2 py-1.5 text-fg tabular">{nLaps}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pits */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted uppercase">
          Pit stops · thời gian dừng
        </p>
        {driverPits.length === 0 ? (
          <p className="text-muted">Không có pit trong session này</p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-[10px] text-muted">
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Lap</th>
                  <th className="px-2 py-1.5">Stop</th>
                  <th className="px-2 py-1.5">Lane</th>
                  <th className="px-2 py-1.5">Total</th>
                </tr>
              </thead>
              <tbody>
                {driverPits.map((p, i) => {
                  const active =
                    p.driver_number === selected && p.lap_number === currentLap;
                  const stop = p.stop_duration;
                  const lane = p.lane_duration;
                  const total = p.pit_duration;
                  return (
                    <tr
                      key={`${p.driver_number}-${p.lap_number}-${i}`}
                      className={cn(
                        "border-b border-border/60",
                        active && "bg-amber-500/15",
                      )}
                    >
                      <td className="px-2 py-1.5 text-fg">
                        {codeOf(meta, p.driver_number)}
                      </td>
                      <td className="px-2 py-1.5 text-fg tabular">
                        L{p.lap_number}
                      </td>
                      <td className="px-2 py-1.5 text-muted tabular">
                        {stop != null ? `${stop.toFixed(1)}s` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-muted tabular">
                        {lane != null ? `${lane.toFixed(1)}s` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-fg tabular">
                        {total != null ? `${total.toFixed(1)}s` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted">
          Stop = đứng tại box · Lane = vào+ra pit lane · Total = tổng pit.
          Highlight khi Play tới đúng vòng pit.
        </p>
      </div>
    </div>
  );
}
