import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import type { RaceControlRow } from "@/lib/f1/types";
import { Get_Race_Control_Until } from "@/lib/f1/api";
import { useRaceClock } from "@/lib/f1/clock";
import { usePitwall } from "@/lib/f1/store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function flagVariant(flag: string): "green" | "yellow" | "live" | "muted" | "outline" {
  const f = flag.toUpperCase();
  if (f.includes("GREEN") || f.includes("CHEQUERED")) return "green";
  if (f.includes("YELLOW") || f.includes("SAFETY")) return "yellow";
  if (f.includes("RED") || f.includes("BLACK")) return "live";
  return "outline";
}

export function RaceControlTicker() {
  const elapsed = useRaceClock((s) => s.elapsed);
  const sessionKey = usePitwall((s) => s.sessionKey);
  const messages = Get_Race_Control_Until(sessionKey, elapsed);
  const latest = messages[messages.length - 1];
  const seen = useRef<string>("");

  useEffect(() => {
    if (!latest) return;
    if (seen.current === latest.date) return;
    const first = seen.current === "";
    seen.current = latest.date;
    if (first) return;
    const hot =
      /SAFETY CAR|RED FLAG|CHEQUERED|GREEN FLAG — RACE START/i.test(latest.message);
    if (hot) {
      toast(latest.message, { description: latest.flag || latest.category });
    }
  }, [latest]);

  if (!latest) return null;

  return (
    <div className="px-3 pb-2 sm:px-4">
      <div className="flex items-center gap-2 overflow-hidden rounded-lg bg-surface px-3 py-2 shadow-[var(--shadow-border)]">
        <Flag className="size-4 shrink-0 text-accent" aria-hidden />
        <Badge variant={flagVariant(latest.flag)}>{latest.flag || latest.category}</Badge>
        <p className="min-w-0 truncate text-sm font-semibold tracking-wide text-fg uppercase">
          {latest.message}
        </p>
      </div>
    </div>
  );
}

export function RaceControlList({ messages }: { messages: RaceControlRow[] }) {
  const ordered = [...messages].reverse();
  if (ordered.length === 0) {
    return <p className="px-3 py-4 text-sm text-muted">Waiting for race control…</p>;
  }
  return (
    <ol className="flex flex-col">
      {ordered.map((m) => (
        <li
          key={m.date + m.message}
          className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-0"
        >
          <span
            className={cn(
              "mt-1 size-1.5 shrink-0 rounded-full",
              flagVariant(m.flag) === "green" && "bg-flag-green",
              flagVariant(m.flag) === "yellow" && "bg-flag-yellow",
              flagVariant(m.flag) === "live" && "bg-accent",
              flagVariant(m.flag) === "outline" && "bg-muted",
            )}
          />
          <div className="min-w-0">
            <p className="text-sm leading-snug text-fg">{m.message}</p>
            <p className="text-xs tracking-wider text-subtle uppercase">
              {m.category}
              {m.driver_number ? ` · Car ${m.driver_number}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
