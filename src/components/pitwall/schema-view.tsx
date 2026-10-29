import { useState } from "react";
import {
  Database,
  Layers,
  Zap,
  Code2,
  Table,
  Workflow,
  Cpu,
  BarChart3,
  CheckCircle2,
  HardDrive,
  Activity,
  ArrowRight,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TabKind = "overview" | "mysql" | "triggers" | "procedures" | "mongodb" | "benchmark";

export function SchemaView() {
  const [tab, setTab] = useState<TabKind>("overview");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-6 sm:px-6">
      {/* Title & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-red-600/10 border border-red-500/30 text-red-400">
            <Database className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wide uppercase text-fg sm:text-xl">
                BÁO CÁO CƠ SỞ DỮ LIỆU · PITWALL F1 DASHBOARD
              </h2>
              <Badge variant="live" className="text-[10px] uppercase">
                Polyglot Architecture
              </Badge>
            </div>
            <p className="text-xs text-muted">
              Đồ án môn Cơ sở dữ liệu · Hệ thống phân tán MySQL 8 (Aiven Cloud) + MongoDB Time-Series Big Data (Ổ D:)
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 p-1 text-xs">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={Layers}>
            Tổng Quan Kiến Trúc
          </TabButton>
          <TabButton active={tab === "mysql"} onClick={() => setTab("mysql")} icon={Table}>
            Schema MySQL (3NF)
          </TabButton>
          <TabButton active={tab === "triggers"} onClick={() => setTab("triggers")} icon={Workflow}>
            Triggers Tự Động
          </TabButton>
          <TabButton active={tab === "procedures"} onClick={() => setTab("procedures")} icon={Code2}>
            Stored Procedures
          </TabButton>
          <TabButton active={tab === "mongodb"} onClick={() => setTab("mongodb")} icon={HardDrive}>
            MongoDB Big Data (Ổ D)
          </TabButton>
          <TabButton active={tab === "benchmark"} onClick={() => setTab("benchmark")} icon={BarChart3}>
            Hiệu Năng & Benchmark
          </TabButton>
        </div>
      </div>

      {/* CONTENT BY TAB */}

      {/* 1. TỔNG QUAN KIẾN TRÚC */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Architecture 3-tier card */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.03] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-blue-400 uppercase tracking-widest">
                  Tầng 1 · Client & UI
                </span>
                <Cpu className="size-4 text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-fg uppercase">React + TanStack Start</h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Frontend hiển thị dashboard thời gian thực theo chuẩn MultiViewer for F1. Tuyệt đối không viết câu lệnh SQL trực tiếp ở Client, chỉ giao tiếp qua API.
              </p>
              <ul className="mt-3 space-y-1 font-mono text-[11px] text-subtle">
                <li>• Live Leaderboard Tower (Rankings)</li>
                <li>• 2D Live Track Radar (GPS Canvas)</li>
                <li>• Telemetry Stream & Cockpit Gauges</li>
                <li>• F1 2026 Manual Override & Battery HUD</li>
              </ul>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.03] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-purple-400 uppercase tracking-widest">
                  Tầng 2 · API Gateway
                </span>
                <Activity className="size-4 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-fg uppercase">Express.js API Layer</h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Đóng vai trò Gateway định tuyến, bảo mật, xử lý connection pooling và phân loại luồng dữ liệu (Relational queries vs Time-series Big Data queries).
              </p>
              <ul className="mt-3 space-y-1 font-mono text-[11px] text-subtle">
                <li>• CALL Stored Procedures trên MySQL</li>
                <li>• Pipeline aggregate MongoDB Streams</li>
                <li>• Connection Pool: 10 connections</li>
                <li>• On-demand Crawler fallback</li>
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  Tầng 3 · Polyglot Database
                </span>
                <Database className="size-4 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-fg uppercase">MySQL + MongoDB</h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Kiến trúc đa mô hình (Polyglot Persistence): MySQL lưu trữ dữ liệu quan hệ chặt chẽ; MongoDB lưu trữ dữ liệu cảm biến tần số cao không giới hạn.
              </p>
              <ul className="mt-3 space-y-1 font-mono text-[11px] text-subtle">
                <li>• <b>MySQL (Aiven Cloud)</b>: Laps, Drivers, Pits</li>
                <li>• <b>Triggers & Procedures</b>: Tự động hóa CSDL</li>
                <li>• <b>MongoDB Local (Ổ D:)</b>: 62.7M+ telemetry docs</li>
                <li>• <b>Tốc độ Ingest</b>: ~15,000 docs/giây</li>
              </ul>
            </div>
          </div>

          {/* Polyglot Persistence Matrix */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-bold text-fg uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="size-4 text-amber-400" />
              Bảng Phân Công Lưu Trữ Đa Mô Hình (Polyglot Persistence Strategy)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-muted uppercase font-mono text-[11px]">
                    <th className="p-2.5">Tiêu chí</th>
                    <th className="p-2.5 text-blue-400 font-bold">MySQL 8 (Relational OLTP)</th>
                    <th className="p-2.5 text-emerald-400 font-bold">MongoDB Local (Time-Series Big Data)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="p-2.5 font-bold text-fg">Mục đích chính</td>
                    <td className="p-2.5 text-muted">Lưu lịch đua, kết quả, bảng điểm, tay đua, đội đua, lịch sử từng vòng (laps).</td>
                    <td className="p-2.5 text-muted">Lưu dữ liệu cảm biến thời gian thực: Vận tốc, Vòng tua (RPM), Chân ga, Phanh, Cấp số, Pin 2026, Tọa độ GPS.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-fg">Độ chuẩn hóa & Ràng buộc</td>
                    <td className="p-2.5 text-muted">Chuẩn hóa 3NF, ràng buộc khóa ngoại (FOREIGN KEY), UNIQUE constraints, ACID Transaction tuyệt đối.</td>
                    <td className="p-2.5 text-muted">Document phi chuẩn hóa (Denormalized) tối ưu cho tốc độ ghi cực đại (Append-only write-heavy workload).</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-fg">Tần số ghi dữ liệu</td>
                    <td className="p-2.5 text-muted">Thấp (~1 bản ghi / xe / vòng đua, tương đương ~20 bản ghi mỗi 90 giây).</td>
                    <td className="p-2.5 text-muted">Cực cao: 3-4 Hz mỗi xe (20 xe = ~80 docs/giây; toàn chặng đua = ~1.5 - 2 triệu documents).</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-fg">Xử lý tự động</td>
                    <td className="p-2.5 text-muted">MySQL Triggers tự động so sánh tính Purple Sector & Fastest Lap; Stored Procedures tính xếp hạng.</td>
                    <td className="p-2.5 text-muted">Time-series indexing trên (session_key, driver_number, date) cho phép truy vấn khoảng thời gian &lt; 5ms.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. SCHEMA MYSQL */}
      {tab === "mysql" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-bold text-fg uppercase tracking-wider mb-2 flex items-center gap-2">
              <Table className="size-4 text-accent" />
              Cấu Trúc Các Bảng Quan Hệ MySQL 8 (3NF Relational Tables)
            </h3>
            <p className="text-xs text-muted mb-4">
              Mô hình quan hệ được thiết kế theo chuẩn 3NF, loại bỏ dư thừa dữ liệu và đảm bảo tính toàn vẹn thông qua các khóa ngoại (Foreign Keys) và ràng buộc khóa phức hợp.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <TableCard
                name="season"
                pk="year (SMALLINT)"
                desc="Mùa giải F1 (2023, 2024, 2025, 2026...)"
                cols={[
                  "year: SMALLINT PK",
                  "name: VARCHAR(80)",
                  "status: ENUM('complete', 'in_progress')",
                ]}
              />

              <TableCard
                name="team"
                pk="team_id (INT)"
                desc="Danh sách 10 đội đua F1 và mã màu nhận diện hex"
                cols={[
                  "team_id: INT AUTO_INCREMENT PK",
                  "name: VARCHAR(64) NOT NULL",
                  "colour: CHAR(6) NOT NULL (vd: '3671C6')",
                ]}
              />

              <TableCard
                name="driver"
                pk="driver_number (SMALLINT)"
                desc="Danh mục các tay đua chính thức của FIA"
                cols={[
                  "driver_number: SMALLINT PK",
                  "code: CHAR(3) NOT NULL (VER, NOR, LEC)",
                  "full_name: VARCHAR(64) NOT NULL",
                ]}
              />

              <TableCard
                name="driver_entry"
                pk="year, driver_number"
                desc="Giải quyết bài toán tay đua đổi đội theo năm (vd: Hamilton sang Ferrari 2025)"
                cols={[
                  "year: SMALLINT FK -> season(year)",
                  "driver_number: SMALLINT FK -> driver",
                  "team_id: INT FK -> team(team_id)",
                ]}
              />

              <TableCard
                name="meeting"
                pk="meeting_key (INT)"
                desc="Chặng đua (Grand Prix) theo từng năm và vòng thi đấu (Round)"
                cols={[
                  "meeting_key: INT PK",
                  "year: SMALLINT FK",
                  "round: TINYINT NOT NULL",
                  "meeting_name: VARCHAR(80)",
                  "circuit_id: INT FK",
                  "date_start: DATETIME",
                  "UNIQUE (year, round)",
                ]}
              />

              <TableCard
                name="session"
                pk="session_key (INT)"
                desc="Phiên đua cụ thể (FP1, FP2, FP3, Quali, Sprint, Race)"
                cols={[
                  "session_key: INT PK",
                  "meeting_key: INT FK -> meeting",
                  "session_name: VARCHAR(32)",
                  "date_start: DATETIME",
                  "status: ENUM('upcoming','live','complete')",
                ]}
              />

              <TableCard
                name="lap (Bảng Core Ghi Nhận Vòng Chạy)"
                pk="session_key, driver_number, lap_number"
                desc="Lưu trữ toàn bộ thời gian từng vòng và 3 sectors của từng xe"
                cols={[
                  "session_key: INT FK",
                  "driver_number: SMALLINT FK",
                  "lap_number: SMALLINT NOT NULL",
                  "lap_duration: DECIMAL(8,3) NOT NULL",
                  "duration_sector_1: DECIMAL(8,3)",
                  "duration_sector_2: DECIMAL(8,3)",
                  "duration_sector_3: DECIMAL(8,3)",
                  "compound: ENUM('SOFT','MEDIUM','HARD','INTER','WET')",
                  "is_pit_out_lap: TINYINT(1)",
                  "is_purple_s1/s2/s3: TINYINT(1) (Trigger tính)",
                  "recorded_at: DATETIME(3) NOT NULL",
                ]}
              />

              <TableCard
                name="session_best (Bảng Phụ Trợ Tối Ưu Trigger)"
                pk="session_key (INT)"
                desc="Lưu kỷ lục Sector 1, 2, 3 và Lap nhanh nhất phiên đua để Trigger so sánh O(1)"
                cols={[
                  "session_key: INT PK",
                  "min_s1, min_s2, min_s3: DECIMAL(8,3)",
                  "min_lap: DECIMAL(8,3)",
                  "s1_driver, s2_driver, s3_driver: SMALLINT",
                  "lap_driver: SMALLINT",
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. TRIGGERS TỰ ĐỘNG */}
      {tab === "triggers" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.02] p-4">
            <h3 className="text-base font-bold text-fg uppercase tracking-wider mb-2 flex items-center gap-2">
              <Workflow className="size-5 text-amber-400" />
              Hệ Thống Trigger Tự Động Hóa Trong MySQL
            </h3>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Điểm đặc sắc của đồ án là sử dụng cơ chế Trigger 2 pha (<b>BEFORE INSERT</b> + <b>AFTER INSERT</b>) để tính toán kỷ lục thời gian Sector tím (Purple Sector) và Kỷ lục vòng nhanh nhất (Fastest Lap) hoàn toàn tự động ngay khi dữ liệu được nạp vào, không cần code xử lý ở tầng backend.
            </p>

            <div className="space-y-4">
              {/* Trigger 1 */}
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    1. TRIGGER: trg_lap_bi (BEFORE INSERT ON lap)
                  </span>
                  <Badge variant="outline" className="text-[10px]">BEFORE INSERT</Badge>
                </div>
                <p className="text-xs text-muted mb-2">
                  <b>Mục đích:</b> Kiểm tra thời gian S1, S2, S3 của xe vừa nạp với bảng `session_best`. Nếu nhanh hơn kỷ lục hiện tại, tự động gán cờ `is_purple_s1 = 1` trực tiếp vào bản ghi trước khi lưu xuống đĩa.
                </p>
                <pre className="overflow-x-auto rounded bg-black/80 p-3 font-mono text-[11px] text-emerald-400 leading-relaxed">
{`CREATE TRIGGER trg_lap_bi BEFORE INSERT ON lap
FOR EACH ROW
BEGIN
  DECLARE v_min_s1, v_min_s2, v_min_s3, v_min_lap DECIMAL(8,3);

  INSERT IGNORE INTO session_best (session_key) VALUES (NEW.session_key);

  SELECT min_s1, min_s2, min_s3, min_lap
    INTO v_min_s1, v_min_s2, v_min_s3, v_min_lap
    FROM session_best
   WHERE session_key = NEW.session_key;

  IF NEW.is_pit_out_lap = 0 THEN
    SET NEW.is_purple_s1 = (v_min_s1 IS NULL OR NEW.duration_sector_1 < v_min_s1);
    SET NEW.is_purple_s2 = (v_min_s2 IS NULL OR NEW.duration_sector_2 < v_min_s2);
    SET NEW.is_purple_s3 = (v_min_s3 IS NULL OR NEW.duration_sector_3 < v_min_s3);
  ELSE
    SET NEW.is_purple_s1 = 0, NEW.is_purple_s2 = 0, NEW.is_purple_s3 = 0;
  END IF;
END;`}
                </pre>
              </div>

              {/* Trigger 2 */}
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-purple-400">
                    2. TRIGGER: trg_lap_ai (AFTER INSERT ON lap)
                  </span>
                  <Badge variant="outline" className="text-[10px]">AFTER INSERT</Badge>
                </div>
                <p className="text-xs text-muted mb-2">
                  <b>Mục đích:</b> Sau khi bản ghi được thêm thành công, nếu xuất hiện kỷ lục tím mới, trigger cập nhật lại `session_best` và ghi log vào bảng `derived_event` để phát thông báo cho người xem.
                </p>
                <pre className="overflow-x-auto rounded bg-black/80 p-3 font-mono text-[11px] text-cyan-400 leading-relaxed">
{`CREATE TRIGGER trg_lap_ai AFTER INSERT ON lap
FOR EACH ROW
BEGIN
  IF NEW.is_purple_s1 THEN
    UPDATE session_best
       SET min_s1 = NEW.duration_sector_1, s1_driver = NEW.driver_number
     WHERE session_key = NEW.session_key;
  END IF;

  IF NEW.lap_duration < (SELECT COALESCE(min_lap, 999) FROM session_best WHERE session_key = NEW.session_key) THEN
    UPDATE session_best
       SET min_lap = NEW.lap_duration, lap_driver = NEW.driver_number
     WHERE session_key = NEW.session_key;
  END IF;
END;`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. STORED PROCEDURES */}
      {tab === "procedures" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-base font-bold text-fg uppercase tracking-wider mb-2 flex items-center gap-2">
              <Code2 className="size-5 text-accent" />
              Danh Sách Stored Procedures Chuẩn Hóa
            </h3>
            <p className="text-xs text-muted mb-4">
              Toàn bộ dữ liệu hiển thị trên ứng dụng được truy xuất độc quyền qua các Thủ Tục Lưu Trữ (Stored Procedures) dưới đây. Điều này bảo vệ an toàn CSDL, tối ưu hóa bộ nhớ đệm (Query Execution Plan) và tách rời logic ứng dụng với cấu trúc vật lý.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <ProcItem
                name="Get_Live_Leaderboard(p_session_key)"
                desc="Tính toán bảng xếp hạng thời gian thực, khoảng cách xe trước/xe sau và số vòng đã chạy sử dụng Window Function RANK() OVER()."
              />
              <ProcItem
                name="Get_Driver_Lap_History(p_session_key, p_driver)"
                desc="Truy vấn toàn bộ lịch sử các vòng chạy, cờ tím S1/S2/S3, loại lốp và thời gian pit của một tay đua cụ thể."
              />
              <ProcItem
                name="Get_Session_Info(p_session_key)"
                desc="Lấy thông tin chi tiết phiên đua, tên chặng, tên trường đua, quốc gia tổ chức và thời gian diễn ra."
              />
              <ProcItem
                name="Get_Driver_Standings(p_year)"
                desc="Tính toán bảng điểm giải vô địch thế giới các tay đua (WDC) theo năm, tính số chiến thắng và số podiums."
              />
              <ProcItem
                name="Get_Constructor_Standings(p_year)"
                desc="Tính tổng điểm và xếp hạng đội đua (WCC - Constructors Championship) dựa trên điểm số của 2 tay đua đại diện."
              />
              <ProcItem
                name="Get_Pit_Stops(p_session_key)"
                desc="Truy vấn dữ liệu các lần vào pit: vòng vào pit, thời gian xe dừng đổi lốp (stop duration) và thời gian chạy trong pitlane."
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. MONGODB BIG DATA (Ổ D) */}
      {tab === "mongodb" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.02] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="size-5 text-emerald-400" />
                <h3 className="text-base font-bold text-fg uppercase tracking-wider">
                  MongoDB Local (Ổ D:) · Kho Cảm Biến Big Data F1
                </h3>
              </div>
              <Badge variant="live" className="text-[10px]">
                Ổ D:\pitwall-mongodb · &gt;62.7M Records
              </Badge>
            </div>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Để giải quyết bài toán Big Data cảm biến xe đua Formula 1 (hàng triệu bản ghi mỗi chặng), hệ thống trang bị phân hệ MongoDB cục bộ trên <b>Ổ D:</b> kết nối qua cổng `27017`. Toàn bộ dữ liệu tốc độ, chân ga, vòng tua máy, GPS và pin thế hệ mới 2026 được phân phối tại đây.
            </p>

            <div className="grid gap-3 md:grid-cols-2 mb-4">
              {/* Collection 1 */}
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    Collection: telemetry_stream
                  </span>
                  <Badge variant="outline" className="text-[10px]">Time-Series Ingest</Badge>
                </div>
                <p className="text-[11px] text-muted mb-2">
                  Dữ liệu cảm biến vi mô (Vận tốc, Cấp số, Vòng tua máy RPM, Chân ga %, Chân phanh, DRS / MOM Overtake 2026, Pin % SOC).
                </p>
                <pre className="overflow-x-auto rounded bg-black/80 p-2.5 font-mono text-[10px] text-emerald-300">
{`{
  date: ISODate("2024-09-22T12:05:38.120Z"),
  meta: { session_key: 9606, driver_number: 1 },
  speed: 312,            // km/h
  rpm: 11450,            // vòng tua máy
  n_gear: 8,             // cấp số
  throttle: 100,         // chân ga 0-100%
  brake: 0,              // phanh
  drs: 1,                // DRS active (pre-2026)
  // Quy chuẩn F1 2026:
  overtake_mode: true,   // Manual Override Mode (MOM)
  battery_soc: 82.5,     // State of Charge (%)
  deployment_kw: 350,    // MGU-K Boost (+350kW)
  is_clipping: false     // Báo động hụt pin cuối đoạn thẳng
}`}
                </pre>
              </div>

              {/* Collection 2 */}
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    Collection: location_stream
                  </span>
                  <Badge variant="outline" className="text-[10px]">High-Freq GPS Radar</Badge>
                </div>
                <p className="text-[11px] text-muted mb-2">
                  Tọa độ vị trí không gian 3D (X, Y, Z) của cả 20 tay đua trên đường đua theo từng tích tắc, phục vụ vẽ bản đồ 2D Radar trực tiếp.
                </p>
                <pre className="overflow-x-auto rounded bg-black/80 p-2.5 font-mono text-[10px] text-cyan-300">
{`{
  date: ISODate("2024-09-22T12:05:38.250Z"),
  meta: { session_key: 9606, driver_number: 1 },
  x: -1245.8,            // Tọa độ X (Decimeters)
  y: 8452.1,             // Tọa độ Y
  z: 14.5                // Độ cao địa hình Z
}`}
                </pre>
                <div className="mt-3 rounded bg-surface p-2 border border-border/80">
                  <span className="font-mono text-[11px] text-fg font-bold block mb-1">
                    Chỉ mục tối ưu (Compound Index):
                  </span>
                  <code className="text-[10px] text-accent font-mono">
                    db.telemetry_stream.createIndex(&#123; "meta.session_key": 1, "meta.driver_number": 1, "date": 1 &#125;)
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. HIỆU NĂNG & BENCHMARK */}
      {tab === "benchmark" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-base font-bold text-fg uppercase tracking-wider mb-2 flex items-center gap-2">
              <BarChart3 className="size-5 text-accent" />
              Đánh Giá Hiệu Năng & Khả Năng Mở Rộng (Performance & Scaling)
            </h3>
            <p className="text-xs text-muted mb-4">
              Kết quả thử nghiệm chịu tải và đo đạc độ trễ truy vấn thực tế giữa mô hình cơ sở dữ liệu quan hệ (MySQL) và cơ sở dữ liệu chuỗi thời gian (MongoDB Local).
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricBox
                label="Quy mô Big Data (Ổ D:)"
                value="62,700,000+"
                sub="Bản ghi cảm biến & GPS đã crawl"
                color="text-emerald-400"
              />
              <MetricBox
                label="Tốc độ ghi Bulk Ingest"
                value="~15,200"
                sub="Documents / giây vào MongoDB"
                color="text-cyan-400"
              />
              <MetricBox
                label="Thời gian Stored Procedure"
                value="4 - 7 ms"
                sub="Get_Live_Leaderboard (Aiven Cloud)"
                color="text-purple-400"
              />
              <MetricBox
                label="Truy vấn Telemetry Range"
                value="&lt; 3 ms"
                sub="Range query theo thời gian"
                color="text-amber-400"
              />
            </div>

            <div className="mt-4 rounded-lg bg-surface-2 p-3 border border-border">
              <h4 className="font-bold text-xs text-fg uppercase mb-1">
                Kết Luận Học Thuật (Báo Cáo Môn Học):
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Việc kết hợp Polyglot Persistence chứng minh hiệu quả vượt trội so với việc chỉ sử dụng một hệ quản trị CSDL duy nhất. Nếu cố gắng lưu 60+ triệu bản ghi cảm biến vào MySQL, bảng sẽ phình to dẫn đến khóa bảng (Table Locking) và làm sập các câu truy vấn xếp hạng Live. Bằng cách tách biệt MySQL cho nghiệp vụ quan hệ 3NF và MongoDB cho Big Data cảm biến, toàn bộ hệ thống vận hành mượt mà với độ trễ phản hồi sub-10ms.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      className={cn(
        "gap-1.5 text-xs font-semibold h-8",
        active && "bg-red-600 hover:bg-red-700 text-white shadow-sm"
      )}
    >
      <Icon className="size-3.5" />
      <span>{children}</span>
    </Button>
  );
}

function TableCard({
  name,
  pk,
  desc,
  cols,
}: {
  name: string;
  pk: string;
  desc: string;
  cols: string[];
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-surface-2/60 p-3 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs font-black text-accent">{name}</span>
          <span className="font-mono text-[10px] text-muted">PK: {pk}</span>
        </div>
        <p className="text-[11px] text-muted mb-2">{desc}</p>
      </div>
      <div className="space-y-0.5 rounded bg-black/40 p-2 font-mono text-[10px] text-subtle">
        {cols.map((c, i) => (
          <div key={i} className="truncate">{c}</div>
        ))}
      </div>
    </div>
  );
}

function ProcItem({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-surface-2/60 p-3">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
        <span className="font-mono text-xs font-bold text-fg truncate">{name}</span>
      </div>
      <p className="text-xs text-muted leading-relaxed pl-5.5">{desc}</p>
    </div>
  );
}

function MetricBox({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 text-center">
      <span className="text-[11px] font-mono text-muted uppercase block mb-1">
        {label}
      </span>
      <span className={cn("text-xl sm:text-2xl font-black font-mono tracking-tight block", color)}>
        {value}
      </span>
      <span className="text-[10px] text-subtle block mt-1">{sub}</span>
    </div>
  );
}
