import { cn } from "@/lib/utils";

const TYRE: Record<string, { letter: string; className: string; label: string }> = {
  SOFT: { letter: "S", className: "border-tyre-soft text-tyre-soft", label: "Soft" },
  MEDIUM: { letter: "M", className: "border-tyre-medium text-tyre-medium", label: "Medium" },
  HARD: { letter: "H", className: "border-tyre-hard text-tyre-hard", label: "Hard" },
  INTERMEDIATE: { letter: "I", className: "border-flag-green text-flag-green", label: "Inter" },
  WET: { letter: "W", className: "border-muted text-muted", label: "Wet" },
};

export function TyreCompound({
  compound,
  size = "sm",
}: {
  compound?: string | null;
  size?: "sm" | "md";
}) {
  const t = TYRE[compound ?? ""] ?? {
    letter: "–",
    className: "border-border text-muted",
    label: "Unknown",
  };
  return (
    <span
      title={t.label}
      className={cn(
        "inline-flex items-center justify-center rounded-full border-2 font-mono font-semibold leading-none",
        size === "sm" ? "tyre-letter size-5" : "size-7 text-xs",
        t.className,
      )}
    >
      {t.letter}
    </span>
  );
}
