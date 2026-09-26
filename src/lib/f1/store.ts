import { create } from "zustand";
import { SESSION_KEY } from "./simulate";

export type AppView = "timing" | "standings" | "schema";
export type StandingsTab = "calendar" | "drivers" | "constructors";

export type ArchiveWeather = {
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  wind_speed: number;
  rainfall: number;
};

type PitwallState = {
  view: AppView;
  year: number;
  sessionKey: number;
  standingsTab: StandingsTab;
  /** OpenF1 archive: elapsed seconds in race clock */
  archiveElapsed: number;
  archiveDuration: number;
  archiveLap: number;
  archiveMaxLap: number;
  archiveWeather: ArchiveWeather | null;
  setView: (v: AppView) => void;
  setYear: (y: number) => void;
  setSessionKey: (k: number) => void;
  setStandingsTab: (t: StandingsTab) => void;
  setArchiveClock: (p: {
    elapsed?: number;
    duration?: number;
    lap?: number;
    maxLap?: number;
    weather?: ArchiveWeather | null;
  }) => void;
  goLive: () => void;
  openArchive: () => void;
};

export const usePitwall = create<PitwallState>((set) => ({
  view: "timing",
  year: 2024,
  sessionKey: 9472,
  standingsTab: "calendar",
  archiveElapsed: 0,
  archiveDuration: 0,
  archiveLap: 1,
  archiveMaxLap: 0,
  archiveWeather: null,
  setView: (view) => set({ view }),
  setYear: (year) => set({ year, standingsTab: "calendar" }),
  setSessionKey: (sessionKey) =>
    set({
      sessionKey,
      view: "timing",
      archiveElapsed: 0,
      archiveDuration: 0,
      archiveLap: 1,
      archiveMaxLap: 0,
      archiveWeather: null,
    }),
  setStandingsTab: (standingsTab) => set({ standingsTab }),
  setArchiveClock: (p) =>
    set((s) => ({
      archiveElapsed: p.elapsed ?? s.archiveElapsed,
      archiveDuration: p.duration ?? s.archiveDuration,
      archiveLap: p.lap ?? s.archiveLap,
      archiveMaxLap: p.maxLap ?? s.archiveMaxLap,
      archiveWeather:
        p.weather !== undefined ? p.weather : s.archiveWeather,
    })),
  goLive: () =>
    set({
      view: "timing",
      sessionKey: 11377, // Baku 2026 Race — OpenF1 live/poll
      archiveElapsed: 0,
      archiveDuration: 0,
      archiveLap: 1,
      archiveMaxLap: 0,
      archiveWeather: null,
    }),
  openArchive: () => set({ view: "standings", standingsTab: "calendar" }),
}));
