import { useEffect } from "react";
import { useRaceClock } from "@/lib/f1/clock";
import { usePitwall } from "@/lib/f1/store";

export function RaceTicker() {
  const playing = useRaceClock((s) => s.playing);
  const speed = useRaceClock((s) => s.speed);
  const advance = useRaceClock((s) => s.advance);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      advance(dt * speed);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, advance]);

  return null;
}

export function useKeyboardPlayback() {
  const toggle = useRaceClock((s) => s.toggle);
  const cycleSpeed = useRaceClock((s) => s.cycleSpeed);
  const restart = useRaceClock((s) => s.restart);
  const view = usePitwall((s) => s.view);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      if (view !== "timing") return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.key === "s" || e.key === "S") {
        cycleSpeed();
      } else if (e.key === "r" || e.key === "R") {
        restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, cycleSpeed, restart, view]);
}
