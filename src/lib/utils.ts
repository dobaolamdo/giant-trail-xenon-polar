import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function teamHex(colour: string): string {
  const c = colour.trim();
  if (!c) return "#8b8d94";
  return c.startsWith("#") ? c : `#${c}`;
}

export function onTeam(colour: string): string {
  const hex = teamHex(colour).slice(1);
  if (hex.length < 6) return "#f3f4f6";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? "#070708" : "#f3f4f6";
}
