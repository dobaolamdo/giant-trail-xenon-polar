import { createFileRoute } from "@tanstack/react-router";
import { PitwallShell } from "@/components/pitwall/shell";

export const Route = createFileRoute("/")({ component: Home });

/** Home = full pitwall shell (leaderboard + replay + driver panel). */
function Home() {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <PitwallShell />
    </main>
  );
}
