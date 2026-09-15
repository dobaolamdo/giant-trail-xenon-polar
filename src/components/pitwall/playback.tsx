import { Pause, Play, RotateCcw } from "lucide-react";
import { getFeed, isRaceFinished, sessionProgress } from "@/lib/f1/api";
import { SPEED_OPTIONS, useRaceClock } from "@/lib/f1/clock";
import { usePitwall } from "@/lib/f1/store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function PlaybackBar() {
  const elapsed = useRaceClock((s) => s.elapsed);
  const duration = useRaceClock((s) => s.duration);
  const playing = useRaceClock((s) => s.playing);
  const speed = useRaceClock((s) => s.speed);
  const toggle = useRaceClock((s) => s.toggle);
  const setSpeed = useRaceClock((s) => s.setSpeed);
  const setElapsed = useRaceClock((s) => s.setElapsed);
  const restart = useRaceClock((s) => s.restart);
  const sessionKey = usePitwall((s) => s.sessionKey);
  const finished = isRaceFinished(sessionKey, elapsed);
  const progress = sessionProgress(sessionKey, elapsed);
  const showPause = playing && !finished;
  const feed = getFeed(sessionKey);
  const max = feed?.duration ?? duration;

  return (
    <div className="border-t border-border bg-surface px-3 py-2.5 pr-28 sm:px-4 sm:pr-32">
      <div className="mb-2">
        <Slider
          min={0}
          max={Math.max(1, max)}
          step={1}
          value={[elapsed]}
          onValueChange={(v) => setElapsed(v[0] ?? 0)}
          aria-label="Race progress"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={toggle}
          aria-label={showPause ? "Pause" : "Play"}
        >
          {showPause ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={restart} aria-label="Restart replay">
          <RotateCcw className="size-4" />
        </Button>
        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={speed === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setSpeed(s)}
              className="min-w-10 px-2"
            >
              {s}x
            </Button>
          ))}
        </div>
        <span className="ml-auto font-mono text-xs text-muted tabular">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}
