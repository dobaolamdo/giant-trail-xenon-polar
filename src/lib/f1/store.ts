import { create } from "zustand";
import { SESSION_KEY } from "./simulate";

export type AppView = "timing" | "standings" | "schema";
export type StandingsTab = "calendar" | "drivers" | "constructors";

type PitwallState = {
  view: AppView;
  year: number;
  sessionKey: number;
  standingsTab: StandingsTab;
  setView: (v: AppView) => void;
  setYear: (y: number) => void;
  setSessionKey: (k: number) => void;
  setStandingsTab: (t: StandingsTab) => void;
  goLive: () => void;
  openArchive: () => void;
};

export const usePitwall = create<PitwallState>((set) => ({
  view: "timing",
  year: 2024,
  // Bahrain 2024 — đã pump OpenF1 vào Aiven
  sessionKey: 9472,
  standingsTab: "calendar",
  setView: (view) => set({ view }),
  setYear: (year) => set({ year, standingsTab: "calendar" }),
  setSessionKey: (sessionKey) => set({ sessionKey, view: "timing" }),
  setStandingsTab: (standingsTab) => set({ standingsTab }),
  // Nút Live: vào session Aiven (9472), không quay simulate cũ
  goLive: () => set({ view: "timing", sessionKey: 9472 }),
  openArchive: () => set({ view: "standings", standingsTab: "calendar" }),
}));
