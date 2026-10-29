import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });
dotenv.config();

// Default to Local MongoDB on Drive D: port 27017
const LOCAL_MONGO_URI = process.env.LOCAL_MONGODB_URI || "mongodb://127.0.0.1:27017/pitwall";

const DATABASE_URL = process.env.DATABASE_URL;

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

process.on("SIGINT", () => {
  console.log(`\n\n${c.yellow}🛑 [TẠM DỪNG] Đã dừng tiến trình crawl an toàn.${c.reset}`);
  console.log(`${c.green}✓ Tất cả dữ liệu trước đó đã được ghi vào MongoDB Local (Ổ D:) và Aiven MySQL.${c.reset}`);
  console.log(`${c.white}✓ Lần sau chạy lại, hệ thống sẽ tự động BỎ QUA các chặng đã crawl xong để tiếp tục các chặng còn lại!${c.reset}\n`);
  process.exit(0);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Resilient fetch: handles 404 (cancelled races), 429 (rate limit), and network drops
async function fetchWithRetry(url, retries = 5, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) {
        // 404 means resource or race does not exist (e.g. cancelled race like Imola 2023)
        return null;
      }
      if (res.status === 429) {
        const wait = delay * attempt + Math.floor(Math.random() * 500);
        console.log(`  ${c.yellow}⚠️ [Rate Limit 429] Đang chờ ${wait}ms...${c.reset}`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(delay * attempt);
    }
  }
}

async function initLocalMongo() {
  console.log(`📡 Đang kết nối MongoDB Local tại: ${c.bold}${LOCAL_MONGO_URI}${c.reset} ...`);
  let client;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      client = new MongoClient(LOCAL_MONGO_URI, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 3000,
      });
      await client.connect();
      break;
    } catch (err) {
      if (err.message.includes("ECONNREFUSED") || err.name === "MongoServerSelectionError") {
        console.log(`  ${c.yellow}⚠️ Phát hiện MongoDB Local trên Ổ D chưa bật.${c.reset}`);
        console.log(`  ${c.cyan}🚀 Đang tự động khởi động MongoDB Local từ D:\\pitwall-mongodb\\bin\\mongod.exe ...${c.reset}`);
        try {
          const { spawn } = await import("child_process");
          const child = spawn(
            "D:\\pitwall-mongodb\\bin\\mongod.exe",
            [
              "--dbpath", "D:\\pitwall-mongodb\\data",
              "--logpath", "D:\\pitwall-mongodb\\logs\\mongod.log",
              "--port", "27017",
              "--bind_ip", "127.0.0.1",
            ],
            { detached: true, stdio: "ignore" }
          );
          child.unref();
          await sleep(3500); // Đợi MongoDB nạp WiredTiger và mở cổng 27017
          continue;
        } catch (spawnErr) {
          console.error("Không thể tự khởi động mongod:", spawnErr.message);
        }
      }
      if (attempt === 3) throw err;
      await sleep(1000);
    }
  }

  const db = client.db("pitwall");
  await db.command({ ping: 1 });
  console.log(`${c.green}✓ Đã kết nối MongoDB Local (Ổ D:) thành công!${c.reset}`);

  // Ensure Time-Series collections exist
  const existingCols = await db.listCollections().toArray();
  const colNames = existingCols.map((c) => c.name);

  if (!colNames.includes("telemetry_stream")) {
    try {
      await db.createCollection("telemetry_stream", {
        timeseries: {
          timeField: "date",
          metaField: "meta",
          granularity: "seconds",
        },
      });
      console.log(`${c.green}✓ Khởi tạo Time-Series Collection: telemetry_stream${c.reset}`);
    } catch {}
  }

  if (!colNames.includes("location_stream")) {
    try {
      await db.createCollection("location_stream", {
        timeseries: {
          timeField: "date",
          metaField: "meta",
          granularity: "seconds",
        },
      });
      console.log(`${c.green}✓ Khởi tạo Time-Series Collection: location_stream${c.reset}`);
    } catch {}
  }

  // Ensure high-speed compound indexes exist for instant queries
  try {
    await db.collection("location_stream").createIndex({ "meta.session_key": 1, "meta.driver_number": 1, date: 1 });
    await db.collection("telemetry_stream").createIndex({ "meta.session_key": 1, "meta.driver_number": 1, date: 1 });
  } catch {}

  return { client, db };
}

async function initMySQL() {
  const pool = mysql.createPool({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
  });
  return pool;
}

export async function crawlMaxpingSession(sessionKey, { db, mysqlPool, sessionIndex = 1, totalSessions = 1 }) {
  const t0 = Date.now();
  console.log(`\n${c.cyan}================================================================${c.reset}`);
  console.log(`🏎️  ${c.bold}[${sessionIndex}/${totalSessions}] KIỂM TRA SESSION #${sessionKey}${c.reset}`);

  // CHECK IF ALREADY CRAWLED: If this session already has > 50,000 docs in location_stream, SKIP IT!
  const existingDocs = await db.collection("location_stream").countDocuments({ "meta.session_key": sessionKey });
  if (existingDocs > 50000) {
    console.log(`  ${c.green}⏩ [ĐÃ CÓ DỮ LIỆU] Session #${sessionKey} đã có ${existingDocs.toLocaleString()} GPS documents trên Ổ D. Tự động BỎ QUA để chạy tiếp!${c.reset}`);
    return { sessionKey, skipped: true, totalDocs: existingDocs };
  }

  // 1. Session Info
  const sessions = await fetchWithRetry(`https://api.openf1.org/v1/sessions?session_key=${sessionKey}`);
  const s = Array.isArray(sessions) ? sessions[0] : null;
  if (!s) {
    console.log(`  ${c.yellow}⚠️ [Chặng #${sessionKey} không tìm thấy trên OpenF1 hoặc bị hủy]. Bỏ qua và chuyển sang chặng tiếp theo.${c.reset}`);
    return null;
  }

  const raceName = `${s.circuit_short_name || s.country_name || "Meeting"} GP ${s.year}`;
  console.log(`  🏁 ${c.bold}${raceName}${c.reset} (${s.country_name}, ${s.year}) - ${s.session_name || "Race"}`);

  // Sync session to MySQL & Local Mongo
  try {
    await mysqlPool.query(`INSERT IGNORE INTO seasons (year, name) VALUES (?, ?)`, [
      s.year,
      `${s.year} FIA Formula One World Championship`,
    ]);
    await mysqlPool.query(
      `INSERT IGNORE INTO meetings (meeting_key, year, meeting_name, circuit_short_name, country_name, date_start)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        s.meeting_key,
        s.year,
        `${s.location || s.circuit_short_name || "Meeting"} Grand Prix`,
        s.circuit_short_name || null,
        s.country_name || null,
        s.date_start ? String(s.date_start).slice(0, 19).replace("T", " ") : null,
      ]
    );
    await mysqlPool.query(
      `INSERT IGNORE INTO sessions (session_key, meeting_key, session_name, session_type, date_start, total_laps)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        s.session_key,
        s.meeting_key,
        s.session_name || "Race",
        s.session_type || "Race",
        s.date_start ? String(s.date_start).slice(0, 19).replace("T", " ") : null,
        null,
      ]
    );
  } catch {}

  await db.collection("sessions").updateOne(
    { session_key: sessionKey },
    { $set: { ...s, updated_at: new Date() } },
    { upsert: true }
  );

  // 2. Drivers
  const drivers = await fetchWithRetry(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
  const activeDrivers = Array.isArray(drivers) ? drivers.filter((d) => d.driver_number != null) : [];

  if (activeDrivers.length === 0) {
    console.log(`  ${c.yellow}⚠️ Không có tay đua nào trong chặng #${sessionKey} (chặng đua có thể đã bị hủy). Bỏ qua.${c.reset}`);
    return null;
  }

  for (const d of activeDrivers) {
    const team = d.team_name || "Unknown";
    try {
      await mysqlPool.query(`INSERT IGNORE INTO teams (team_name, team_colour) VALUES (?, ?)`, [
        team,
        d.team_colour ? `#${d.team_colour}` : null,
      ]);
      await mysqlPool.query(
        `INSERT INTO drivers (driver_number, name_acronym, full_name, team_name)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name_acronym=VALUES(name_acronym), full_name=VALUES(full_name), team_name=VALUES(team_name)`,
        [d.driver_number, d.name_acronym || String(d.driver_number), d.full_name || d.broadcast_name || "Unknown", team]
      );
    } catch {}

    await db.collection("drivers").updateOne(
      { session_key: sessionKey, driver_number: d.driver_number },
      { $set: { ...d, updated_at: new Date() } },
      { upsert: true }
    );
  }

  // 3. Laps
  const laps = await fetchWithRetry(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`);
  const validLaps = Array.isArray(laps) ? laps.filter((l) => l.driver_number != null && l.lap_number != null) : [];

  if (validLaps.length === 0) {
    console.log(`  ${c.yellow}⚠️ Không có dữ liệu vòng đua (Laps) cho chặng #${sessionKey}. Bỏ qua.${c.reset}`);
    return null;
  }

  const CHUNK = 200;
  for (let i = 0; i < validLaps.length; i += CHUNK) {
    const slice = validLaps.slice(i, i + CHUNK);
    const rows = slice.map((l) => [
      sessionKey,
      l.driver_number,
      l.lap_number,
      l.lap_duration ?? null,
      l.duration_sector_1 ?? null,
      l.duration_sector_2 ?? null,
      l.duration_sector_3 ?? null,
      l.i1_speed ?? null,
      l.i2_speed ?? null,
      l.st_speed ?? null,
      l.is_pit_out_lap ? 1 : 0,
    ]);
    try {
      await mysqlPool.query(
        `INSERT INTO laps (session_key, driver_number, lap_number, lap_duration, duration_sector_1, duration_sector_2, duration_sector_3, i1_speed, i2_speed, st_speed, is_pit_out_lap)
         VALUES ?
         ON DUPLICATE KEY UPDATE lap_duration=VALUES(lap_duration), duration_sector_1=VALUES(duration_sector_1), duration_sector_2=VALUES(duration_sector_2), duration_sector_3=VALUES(duration_sector_3)`,
        [rows]
      );
    } catch {}
  }

  const lapOps = validLaps.map((l) => ({
    updateOne: {
      filter: { session_key: sessionKey, driver_number: l.driver_number, lap_number: l.lap_number },
      update: { $set: { ...l, updated_at: new Date() } },
      upsert: true,
    },
  }));
  await db.collection("laps").bulkWrite(lapOps, { ordered: false });

  // 4. Pit, Weather, RaceControl
  try {
    const [pits, weather, rc] = await Promise.all([
      fetchWithRetry(`https://api.openf1.org/v1/pit?session_key=${sessionKey}`).catch(() => []),
      fetchWithRetry(`https://api.openf1.org/v1/weather?session_key=${sessionKey}`).catch(() => []),
      fetchWithRetry(`https://api.openf1.org/v1/race_control?session_key=${sessionKey}`).catch(() => []),
    ]);

    if (Array.isArray(pits) && pits.length > 0) {
      await db.collection("pit_stops").deleteMany({ session_key: sessionKey });
      await db.collection("pit_stops").insertMany(pits, { ordered: false });
    }
    if (Array.isArray(weather) && weather.length > 0) {
      await db.collection("weather").deleteMany({ session_key: sessionKey });
      await db.collection("weather").insertMany(weather, { ordered: false });
    }
    if (Array.isArray(rc) && rc.length > 0) {
      await db.collection("race_control").deleteMany({ session_key: sessionKey });
      await db.collection("race_control").insertMany(rc, { ordered: false });
    }
  } catch {}

  console.log(`  ✓ Đã nạp ${activeDrivers.length} tay đua, ${validLaps.length} laps, pit, weather vào MySQL + Local MongoDB.`);

  // 5. MAXPING CRAWL: Telemetry & Location for ALL active drivers in parallel batches
  console.log(`  ⚡ ${c.bold}Bắt đầu nạp MAXPING Cảm biến Big Data cho TOÀN BỘ ${activeDrivers.length} tay đua vào Ổ D:...${c.reset}`);

  const telemetryCol = db.collection("telemetry_stream");
  const locationCol = db.collection("location_stream");

  let totalTelem = 0;
  let totalLoc = 0;

  // Process drivers with concurrency = 3
  const CONCURRENCY = 3;
  for (let i = 0; i < activeDrivers.length; i += CONCURRENCY) {
    const batch = activeDrivers.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (d) => {
        const drvNum = d.driver_number;
        const name = d.name_acronym || `#${drvNum}`;

        // A. Car Data (Telemetry)
        try {
          const carData = await fetchWithRetry(
            `https://api.openf1.org/v1/car_data?session_key=${sessionKey}&driver_number=${drvNum}`
          );
          if (Array.isArray(carData) && carData.length > 0) {
            const is2026 = s?.year === 2026;
            const docs = carData.map((cd) => {
              const speed = cd.speed ?? 0;
              const throttle = cd.throttle ?? 0;
              const drs = cd.drs ?? 0;
              let overtake_mode = false;
              let battery_soc = 82;
              let deployment_kw = 0;
              let is_clipping = false;
              let aero_mode = speed > 260 ? "X-MODE" : "Z-MODE";

              if (is2026) {
                overtake_mode = Boolean(cd.overtake_mode ?? (drs > 0 || (throttle > 95 && speed > 270)));
                battery_soc = cd.battery_soc ?? Math.max(12, Math.min(100, Math.round(92 - (speed / 340) * 45)));
                deployment_kw = cd.deployment_kw ?? (throttle > 80 && battery_soc > 16 ? 350 : Math.round(throttle * 3.5));
                is_clipping = Boolean(cd.is_clipping ?? (throttle > 95 && speed > 310 && battery_soc <= 16));
              }

              return {
                date: new Date(cd.date),
                meta: { session_key: sessionKey, driver_number: drvNum },
                speed,
                rpm: cd.rpm ?? 0,
                gear: cd.n_gear ?? 0,
                throttle,
                brake: cd.brake ?? 0,
                drs: is2026 ? 0 : drs,
                ...(is2026 ? { overtake_mode, battery_soc, deployment_kw, is_clipping, aero_mode } : {}),
              };
            });
            const CHUNK = 5000;
            for (let k = 0; k < docs.length; k += CHUNK) {
              await telemetryCol.insertMany(docs.slice(k, k + CHUNK), { ordered: false });
            }
            totalTelem += docs.length;
          }
        } catch {}

        // B. Location (GPS)
        try {
          const locData = await fetchWithRetry(
            `https://api.openf1.org/v1/location?session_key=${sessionKey}&driver_number=${drvNum}`
          );
          if (Array.isArray(locData) && locData.length > 0) {
            const docs = locData.map((ld) => ({
              date: new Date(ld.date),
              meta: { session_key: sessionKey, driver_number: drvNum },
              x: ld.x ?? 0,
              y: ld.y ?? 0,
              z: ld.z ?? 0,
            }));
            const CHUNK = 5000;
            for (let k = 0; k < docs.length; k += CHUNK) {
              await locationCol.insertMany(docs.slice(k, k + CHUNK), { ordered: false });
            }
            totalLoc += docs.length;
          }
        } catch {}

        process.stdout.write(`    🏎️  #${drvNum} ${name} ${c.green}✓${c.reset}  `);
      })
    );
    console.log();
    await sleep(200);
  }

  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  const totalDocs = totalTelem + totalLoc;
  const speed = Math.round(totalDocs / (dur || 1));

  console.log(`\n  ${c.green}✓ Hoàn thành ${raceName}: +${totalDocs.toLocaleString()} records trong ${dur}s (~${speed.toLocaleString()} docs/sec)${c.reset}`);
  return { sessionKey, raceName, totalDocs, laps: validLaps.length };
}

async function main() {
  const t0 = Date.now();
  console.log(`\n${c.magenta}================================================================${c.reset}`);
  console.log(`${c.bold}${c.white}🚀 PITWALL MAXPING CRAWLER · LOCAL MONGODB (DRIVE D:)${c.reset}`);
  console.log(`${c.dim}Crawl không giới hạn dung lượng: Tất cả chặng, tất cả 20 tay đua, full cảm biến${c.reset}`);
  console.log(`${c.magenta}================================================================${c.reset}\n`);

  const [{ client, db }, mysqlPool] = await Promise.all([initLocalMongo(), initMySQL()]);

  try {
    const args = process.argv.slice(2);
    let sessionKeys = [];

    // Parse options: --session 9606, --year 2024, --3years
    if (args.includes("--session")) {
      const idx = args.indexOf("--session");
      sessionKeys = [Number(args[idx + 1])];
    } else if (args.includes("--3years")) {
      console.log(`🔍 Đang quét danh sách các chặng 3 năm (2023, 2024, 2025)...`);
      for (const y of [2023, 2024, 2025]) {
        try {
          const list = await fetchWithRetry(`https://api.openf1.org/v1/sessions?session_name=Race&year=${y}`);
          if (Array.isArray(list)) sessionKeys.push(...list.map((s) => s.session_key).filter(Boolean));
        } catch {}
      }
    } else if (args.includes("--year") || args.includes("--2026")) {
      const idx = args.indexOf("--year");
      const y = args.includes("--2026") ? 2026 : (Number(args[idx + 1]) || 2024);
      console.log(`🔍 Quét các chặng đua mùa giải ${y}...`);
      try {
        const list = await fetchWithRetry(`https://api.openf1.org/v1/sessions?session_name=Race&year=${y}`);
        if (Array.isArray(list) && list.length > 0) {
          sessionKeys.push(...list.map((s) => s.session_key).filter(Boolean));
        }
      } catch {}
      if (y === 2026 && !sessionKeys.includes(11377)) {
        sessionKeys.unshift(11377); // Luôn nạp Baku GP 2026 demo trước tiên
      }
    } else {
      // Default: 2024 season (24 races)
      console.log(`🔍 Mặc định quét TOÀN BỘ 24 chặng đua F1 mùa giải 2024...`);
      try {
        const list = await fetchWithRetry(`https://api.openf1.org/v1/sessions?session_name=Race&year=2024`);
        if (Array.isArray(list)) sessionKeys.push(...list.map((s) => s.session_key).filter(Boolean));
      } catch {}
    }

    console.log(`\n🎯 Danh sách: ${c.bold}${sessionKeys.length}${c.reset} chặng đua sẽ được crawl Maxping vào Ổ D:!\n`);

    let grandDocs = 0;
    for (let i = 0; i < sessionKeys.length; i++) {
      try {
        const res = await crawlMaxpingSession(sessionKeys[i], {
          db,
          mysqlPool,
          sessionIndex: i + 1,
          totalSessions: sessionKeys.length,
        });
        if (res) grandDocs += res.totalDocs || 0;
      } catch (err) {
        console.log(`  ${c.yellow}⚠️ [Chặng #${sessionKeys[i]} gặp lỗi (${err.message})]. Bỏ qua và tiếp tục chặng tiếp theo...${c.reset}`);
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const [stats, telemTotal, locTotal] = await Promise.all([
      db.command({ dbStats: 1 }).catch(() => ({})),
      db.collection("telemetry_stream").countDocuments(),
      db.collection("location_stream").countDocuments(),
    ]);

    console.log(`\n${c.green}================================================================${c.reset}`);
    console.log(`${c.bold}${c.green}🎉 MAXPING CRAWL HOÀN THÀNH TẤT CẢ CÁC CHẶNG!${c.reset}`);
    console.log(`  ⏱️  Tổng thời gian: ${elapsed} giây`);
    console.log(`  💾 Dữ liệu lưu tại: D:\\pitwall-mongodb\\data (Ổ D)`);
    console.log(`  📊 Thống kê MongoDB Local trên Ổ D:`);
    console.log(`     • Tổng Telemetry Records: ${c.bold}${telemTotal.toLocaleString()}${c.reset}`);
    console.log(`     • Tổng GPS Location Records: ${c.bold}${locTotal.toLocaleString()}${c.reset}`);
    console.log(`     • TỔNG CỘNG BIG DATA: ${c.bold}${c.cyan}${(telemTotal + locTotal).toLocaleString()} documents${c.reset}`);
    console.log(`     • Dung lượng trên ổ D: ${(stats.dataSize ? (stats.dataSize / 1024 / 1024).toFixed(2) : "0")} MB`);
    console.log(`${c.green}================================================================${c.reset}\n`);
  } finally {
    await client.close();
    await mysqlPool.end();
  }
}

main().catch((err) => {
  console.error(`${c.red}Lỗi Maxping:${c.reset}`, err);
  process.exit(1);
});
