import type { PitStopRow } from "@/lib/f1/types";
import { splitName } from "@/lib/f1/format";

export function PitStopTable({ stops }: { stops: PitStopRow[] }) {
  if (stops.length === 0) {
    return <p className="px-3 py-4 text-sm text-muted">No pit stops yet.</p>;
  }
  const latest = [...stops].reverse();
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-xs tracking-widest text-subtle uppercase">
          <th className="px-3 py-1.5 font-medium">Driver</th>
          <th className="px-2 py-1.5 font-medium">Lap</th>
          <th className="px-2 py-1.5 font-medium">Stop</th>
          <th className="px-3 py-1.5 font-medium">Lane</th>
        </tr>
      </thead>
      <tbody>
        {latest.map((s) => {
          const { last } = splitName(s.full_name);
          return (
            <tr key={`${s.driver_number}-${s.lap_number}`} className="border-t border-border">
              <td className="px-3 py-1.5 text-sm font-semibold tracking-wide uppercase">
                {last}
              </td>
              <td className="px-2 py-1.5 font-mono text-sm tabular">{s.lap_number}</td>
              <td className="px-2 py-1.5 font-mono text-sm tabular">
                {s.stop_duration.toFixed(1)}s
              </td>
              <td className="px-3 py-1.5 font-mono text-sm tabular text-muted">
                {s.lane_duration.toFixed(1)}s
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
