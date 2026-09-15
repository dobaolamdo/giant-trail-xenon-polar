import { ArrowRight, Database } from "lucide-react";

const LAYERS = [
  {
    name: "Frontend",
    job: "Hiển thị. Không viết SQL.",
    items: ["Leaderboard", "Standings", "Trace / purple"],
  },
  {
    name: "Backend",
    job: "CALL procedure, trả JSON.",
    items: ["/api/leaderboard", "/api/laps", "/api/standings/*"],
  },
  {
    name: "MySQL",
    job: "Bảng raw + trigger + procedure.",
    items: ["INSERT laps", "trg_laps_session_best", "Get_* "],
  },
];

const TABLES = [
  { name: "laps", kind: "RAW", note: "Data pump INSERT. Không chứa is_purple." },
  { name: "session_best", kind: "TRIG", note: "Trigger ghi khi có fastest mới." },
  { name: "session_entry", kind: "RAW", note: "RUNNING / PIT / DNF." },
  { name: "race_result", kind: "RAW", note: "Kết quả chặng → tính standings." },
  { name: "driver_season", kind: "RAW", note: "Đổi đội theo năm." },
  { name: "meeting / session", kind: "RAW", note: "Lịch, session_key." },
];

const PROCS = [
  ["Get_Live_Leaderboard", "session_key", "Timing tower"],
  ["Get_Driver_Lap_History", "session_key, driver", "Driver panel"],
  ["Get_Session_Weather", "session_key", "Header"],
  ["Get_Race_Control_Feed", "session_key, since", "Ticker"],
  ["Get_Pit_Stops", "session_key", "Pits tab"],
  ["Get_Session_Info", "session_key", "Title"],
  ["Get_Driver_List", "session_key", "Grid"],
  ["Get_Seasons", "—", "Year tabs"],
  ["Get_Season_Meetings", "year", "Calendar"],
  ["Get_Race_Result", "session_key", "Archive race"],
  ["Get_Driver_Standings", "year", "WDC"],
  ["Get_Constructor_Standings", "year", "WCC"],
];

const TEAM = [
  ["A", "Schema", "Bảng, FK, index, UNIQUE(session, driver, lap)"],
  ["B", "Trigger", "AFTER INSERT laps → session_best. Demo INSERT tay."],
  ["C", "Live proc", "7 procedure timing + window RANK/MIN"],
  ["D", "Archive proc", "Seasons, meetings, result, standings"],
  ["E", "Pump + API", "OpenF1 → INSERT. Express CALL → JSON."],
];

export function SchemaView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 sm:px-4">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-accent" aria-hidden />
        <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">
          Hợp đồng CSDL · frontend đã khóa cột
        </h2>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {LAYERS.map((layer, i) => (
          <div key={layer.name} className="panel relative px-3 py-3">
            {i < LAYERS.length - 1 && (
              <ArrowRight className="absolute -right-3 top-6 hidden size-4 text-subtle md:block" />
            )}
            <p className="text-xs tracking-widest text-accent uppercase">{layer.name}</p>
            <p className="mt-1 text-base font-bold tracking-wide uppercase">{layer.job}</p>
            <ul className="mt-2 space-y-0.5 font-mono text-xs text-muted">
              {layer.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <p className="px-3 py-2 text-xs tracking-widest text-subtle uppercase">Tables</p>
        <ul className="divide-y divide-border">
          {TABLES.map((t) => (
            <li key={t.name} className="flex items-baseline gap-3 px-3 py-2">
              <span className="w-36 shrink-0 font-mono text-sm text-fg">{t.name}</span>
              <span className="w-10 shrink-0 font-mono text-xs text-accent">{t.kind}</span>
              <span className="min-w-0 text-sm text-muted">{t.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel overflow-x-auto">
        <p className="px-3 py-2 text-xs tracking-widest text-subtle uppercase">
          Procedures · cùng tên hàm frontend đang gọi
        </p>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs tracking-widest text-subtle uppercase">
              <th className="px-3 py-1 font-medium">Procedure</th>
              <th className="px-3 py-1 font-medium">In</th>
              <th className="px-3 py-1 font-medium">UI</th>
            </tr>
          </thead>
          <tbody>
            {PROCS.map(([p, inp, ui]) => (
              <tr key={p} className="border-t border-border">
                <td className="px-3 py-1.5 font-mono text-sm text-fg">{p}</td>
                <td className="px-3 py-1.5 font-mono text-xs text-muted">{inp}</td>
                <td className="px-3 py-1.5 text-sm text-muted">{ui}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel px-3 py-3">
        <p className="text-xs tracking-widest text-subtle uppercase">Trigger demo</p>
        <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre text-fg">
{`INSERT INTO laps (session_key, driver_number, lap_number,
  duration_sector_1, duration_sector_2, duration_sector_3,
  lap_duration, compound, is_pit_out_lap, ts)
VALUES (96001, 4, 41, 26.9, 33.9, 36.1, 96.9, 'SOFT', 0, NOW(3));

SELECT * FROM session_best WHERE session_key = 96001 AND kind = 'S2';
-- driver_number = 4  ·  duration = 33.900
-- Không ai gõ UPDATE. Trigger vừa chạy.`}
        </pre>
      </section>

      <section className="panel overflow-hidden">
        <p className="px-3 py-2 text-xs tracking-widest text-subtle uppercase">
          Chia nhóm 5 người
        </p>
        <ul className="divide-y divide-border">
          {TEAM.map(([who, title, detail]) => (
            <li key={who} className="flex items-baseline gap-3 px-3 py-2">
              <span className="w-6 shrink-0 font-mono text-sm text-accent">{who}</span>
              <span className="w-24 shrink-0 text-sm font-bold tracking-wide uppercase">
                {title}
              </span>
              <span className="min-w-0 text-sm text-muted">{detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
