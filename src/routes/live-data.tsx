import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/live-data")({ component: LiveData });

// Doi thanh dung URL backend Render cua ban
const API_URL = "https://pitwall-backend-1c59.onrender.com";

type LeaderboardRow = {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  lap_number: number;
  lap_duration: string;
  duration_sector_1: string;
  duration_sector_2: string;
  duration_sector_3: string;
  is_purple_s1: number;
  is_purple_s2: number;
  is_purple_s3: number;
  is_purple_lap: number;
  position: number;
};

function LiveData() {
  const [sessionKey, setSessionKey] = useState(9472);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`${API_URL}/api/leaderboard?session_key=${sessionKey}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
        setStatus("ok");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrMsg(String(err.message || err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  return (
    <main className="min-h-dvh bg-bg text-fg p-6 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Live Data (that, tu Aiven MySQL)</h1>
        <p className="text-sm opacity-60 mb-4">
          Trang nay goi thang API that qua backend Render, khong dung data mo
          phong. Doc lap voi dashboard chinh.
        </p>

        <div className="flex gap-2 mb-4 items-center">
          <label className="text-sm">session_key:</label>
          <select
            className="bg-black/30 border border-white/20 rounded px-2 py-1"
            value={sessionKey}
            onChange={(e) => setSessionKey(Number(e.target.value))}
          >
            <option value={9472}>9472 - Bahrain 2024 (OpenF1 that)</option>
            <option value={9601}>9601 - Seed demo</option>
          </select>
        </div>

        {status === "loading" && <p className="opacity-60">Dang tai...</p>}
        {status === "error" && <p className="text-red-400">Loi: {errMsg}</p>}
        {status === "ok" && rows.length === 0 && (
          <p className="opacity-60">Khong co du lieu cho session nay.</p>
        )}

        {status === "ok" && rows.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/20 text-left">
                <th className="py-1 pr-3">P</th>
                <th className="py-1 pr-3">Driver</th>
                <th className="py-1 pr-3">Team</th>
                <th className="py-1 pr-3">Lap</th>
                <th className="py-1 pr-3">Lap Time</th>
                <th className="py-1 pr-3">S1</th>
                <th className="py-1 pr-3">S2</th>
                <th className="py-1 pr-3">S3</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.driver_number}
                  className="border-b border-white/10"
                  style={{ borderLeft: `3px solid ${r.team_colour}` }}
                >
                  <td className="py-1 pr-3">{r.position}</td>
                  <td className="py-1 pr-3">{r.name_acronym} - {r.full_name}</td>
                  <td className="py-1 pr-3 opacity-70">{r.team_name}</td>
                  <td className="py-1 pr-3">{r.lap_number}</td>
                  <td className="py-1 pr-3">{r.lap_duration}</td>
                  <td className={`py-1 pr-3 ${r.is_purple_s1 ? "text-purple-400 font-bold" : ""}`}>{r.duration_sector_1}</td>
                  <td className={`py-1 pr-3 ${r.is_purple_s2 ? "text-purple-400 font-bold" : ""}`}>{r.duration_sector_2}</td>
                  <td className={`py-1 pr-3 ${r.is_purple_s3 ? "text-purple-400 font-bold" : ""}`}>{r.duration_sector_3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
