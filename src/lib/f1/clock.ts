import { create } from "zustand";
import { RACE } from "./simulate";

const SPEEDS = [8, 16, 32, 64] as const;
export type RaceSpeed = (typeof SPEEDS)[number];

const START_LAP = 18;
const liveStart = RACE.snapshots[START_LAP]?.time ?? 0;

type RaceClock = {
  elapsed: number;
  duration: number;
  playing: boolean;
  speed: RaceSpeed;
  selectedDriver: number;
  setElapsed: (t: number) => void;
  advance: (dtSec: number) => void;
  toggle: () => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: RaceSpeed) => void;
  cycleSpeed: () => void;
  selectDriver: (n: number) => void;
  restart: () => void;
  bindSession: (duration: number, startElapsed: number, driver?: number) => void;
};

export const SPEED_OPTIONS = SPEEDS;

export const useRaceClock = create<RaceClock>((set, get) => ({
  elapsed: liveStart,
  duration: RACE.duration,
  playing: true,
  speed: 32,
  selectedDriver: 4,
  setElapsed: (t) => {
    const duration = get().duration;
    set({
      elapsed: Math.min(duration, Math.max(0, t)),
      playing: t < duration ? get().playing : false,
    });
  },
  advance: (dtSec) => {
    const next = get().elapsed + dtSec;
    const duration = get().duration;
    if (next >= duration) {
      set({ elapsed: duration, playing: false });
      return;
    }
    set({ elapsed: next });
  },
  toggle: () => {
    const { playing, elapsed, duration } = get();
    if (elapsed >= duration - 0.05) {
      set({ elapsed: 0, playing: true });
      return;
    }
    set({ playing: !playing });
  },
  setPlaying: (p) => set({ playing: p }),
  setSpeed: (s) => set({ speed: s }),
  cycleSpeed: () => {
    const i = SPEEDS.indexOf(get().speed);
    set({ speed: SPEEDS[(i + 1) % SPEEDS.length] as RaceSpeed });
  },
  selectDriver: (n) => set({ selectedDriver: n }),
  restart: () => set({ elapsed: 0, playing: true }),
  bindSession: (duration, startElapsed, driver) =>
    set({
      duration,
      elapsed: Math.min(duration, Math.max(0, startElapsed)),
      playing: true,
      ...(driver != null ? { selectedDriver: driver } : {}),
    }),
}));
