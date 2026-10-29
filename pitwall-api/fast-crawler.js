import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.ATLAS_MONGODB_URI ||
  "mongodb://127.0.0.1:27017/pitwall";

const DATABASE_URL = process.env.DATABASE_URL;

const DEFAULT_SESSION = 9606; // Singapore GP 2024

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pretty ANSI colors
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

// Graceful interrupt handler
process.on("SIGINT", () => {
  console.log(`\n\n${c.yellow}🛑 [TẠM DỪNG AN TOÀN] Tiến trình crawl đã dừng lại.${c.reset}`);
  console.log(`${c.green}✓ Tất cả dữ liệu trước thời điểm này đã được lưu TRỰC TIẾP trên MongoDB Atlas & Aiven MySQL.${c.reset}`);
  console.log(`${c.white}✓ Bạn có thể tắt máy bất kỳ lúc nào; lần sau chạy lại hệ thống sẽ tự động cập nhật tiếp.${c.reset}\n`);
  process.exit(0);
});

async function fetchWithRetry(url, retries = 5, delay = 1200) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = delay * attempt + Math.floor(Math.random() * 500);
        console.log(`  ${c.yellow}⚠️ [HTTP 429 Rate Limit] Đang chờ ${wait}ms trước khi thử lại...${c.reset}`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = delay * attempt;
      console.log(`  ${c.dim}[Lỗi mạng lần ${attempt}] ${err.message}. Chờ ${wait}ms...${c.reset}`);
      await sleep(wait);
    }
  }
}

async function connectMongo() {
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
  });

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await client.connect();
      await client.db("pitwall").command({ ping: 1 });
      return client;
    } catch (err) {
      if (attempt === 5) throw err;
      console.log(`  ${c.yellow}Đang kết nối lại MongoDB Atlas (${attempt}/5)...${c.reset}`);
      await sleep(1500);
    }
  }
}

async function connectMySQL() {
  const pool = mysql.createPool({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
  });
  return pool;
}

// Crawl a single session completely: Sessions, Drivers, Laps, Pit, Weather, RaceControl, Telemetry & GPS for ALL drivers
export async function crawlSingleSession(
  sessionKey,
  { mongoDb, mysqlPool, targetDrivers = null, allDrivers = true, onlyMeta = false, sessionIndex = 1, totalSessions = 1 }
) {
  console.log(`\n${c.cyan}----------------------------------------------------------------${c.reset}`);
  console.log(`🏁 ${c.bold}[${sessionIndex}/${totalSessions}] ĐANG CRAWL FULL DATA CHO SESSION #${sessionKey}...${c.reset}`);

  // 1. Fetch Session Info
  const sessions = await fetchWithRetry(`https://api.openf1.org/v1/sessions?session_key=${sessionKey}`);
  const s = Array.isArray(sessions) ? sessions[0] : null;

  if (!s) {
    console.log(`  ${c.yellow}⚠️ Không tìm thấy session ${sessionKey} trên OpenF1. Bỏ qua.${c.reset}`);
    return { sessionKey, ok: false, error: "Not found" };
  }

  const raceName = `${s.circuit_short_name || s.country_name || "Meeting"} GP ${s.year}`;
  console.log(`  🏆 ${c.bold}${raceName}${c.reset} (${s.country_name}, Năm ${s.year}) - ${s.session_name || "Race"}`);

  // 1.1 Upload Session Metadata to Aiven MySQL
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

  // 1.2 Upload Session Metadata directly to MongoDB Atlas
  await mongoDb.collection("sessions").updateOne(
    { session_key: sessionKey },
    { $set: { ...s, updated_at: new Date() } },
    { upsert: true }
  );

  // 2. Fetch Drivers (All drivers)
  const drivers = await fetchWithRetry(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
  if (Array.isArray(drivers) && drivers.length > 0) {
    for (const d of drivers) {
      if (d.driver_number == null) continue;
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

      // Direct upload to MongoDB Atlas
      await mongoDb.collection("drivers").updateOne(
        { session_key: sessionKey, driver_number: d.driver_number },
        { $set: { ...d, updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`  ${c.green}✓ Đã nạp ${drivers.length} tay đua vào cả MySQL & MongoDB Atlas.${c.reset}`);
  }

  // 3. Fetch Laps (All laps)
  const laps = await fetchWithRetry(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`);
  const validLaps = Array.isArray(laps) ? laps.filter((l) => l.driver_number != null && l.lap_number != null) : [];

  if (validLaps.length > 0) {
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

      if (rows.length > 0) {
        try {
          await mysqlPool.query(
            `INSERT INTO laps (session_key, driver_number, lap_number, lap_duration, duration_sector_1, duration_sector_2, duration_sector_3, i1_speed, i2_speed, st_speed, is_pit_out_lap)
             VALUES ?
             ON DUPLICATE KEY UPDATE lap_duration=VALUES(lap_duration), duration_sector_1=VALUES(duration_sector_1), duration_sector_2=VALUES(duration_sector_2), duration_sector_3=VALUES(duration_sector_3)`,
            [rows]
          );
        } catch {}
      }
    }

    const lapOps = validLaps.map((l) => ({
      updateOne: {
        filter: { session_key: sessionKey, driver_number: l.driver_number, lap_number: l.lap_number },
        update: { $set: { ...l, updated_at: new Date() } },
        upsert: true,
      },
    }));
    if (lapOps.length > 0) {
      await mongoDb.collection("laps").bulkWrite(lapOps, { ordered: false });
    }
    console.log(`  ${c.green}✓ Đã nạp ${validLaps.length} vòng chạy (Laps) lên Atlas & MySQL.${c.reset}`);
  }

  // 4. Fetch Pit Stops, Weather & Race Control
  try {
    const [pits, weather, rc] = await Promise.all([
      fetchWithRetry(`https://api.openf1.org/v1/pit?session_key=${sessionKey}`).catch(() => []),
      fetchWithRetry(`https://api.openf1.org/v1/weather?session_key=${sessionKey}`).catch(() => []),
      fetchWithRetry(`https://api.openf1.org/v1/race_control?session_key=${sessionKey}`).catch(() => []),
    ]);

    // A. Pit Stops
    if (Array.isArray(pits) && pits.length > 0) {
      const pitRows = pits
        .filter((p) => p.driver_number != null && p.lap_number != null)
        .map((p) => [sessionKey, p.driver_number, p.lap_number, p.pit_duration ?? null]);
      if (pitRows.length > 0) {
        try {
          await mysqlPool.query(
            `INSERT IGNORE INTO pit_stops (session_key, driver_number, lap_number, pit_duration) VALUES ?`,
            [pitRows]
          );
        } catch {}
      }
      await mongoDb.collection("pit_stops").deleteMany({ session_key: sessionKey });
      await mongoDb.collection("pit_stops").insertMany(pits, { ordered: false });
    }

    // B. Weather
    if (Array.isArray(weather) && weather.length > 0) {
      const wRows = weather.map((w) => [
        sessionKey,
        w.date ? String(w.date).slice(0, 19).replace("T", " ") : null,
        w.air_temperature ?? null,
        w.track_temperature ?? null,
        w.humidity ?? null,
        w.rainfall ?? 0,
        w.wind_speed ?? null,
      ]);
      if (wRows.length > 0) {
        try {
          await mysqlPool.query(
            `INSERT IGNORE INTO weather (session_key, date, air_temperature, track_temperature, humidity, rainfall, wind_speed) VALUES ?`,
            [wRows.slice(0, 100)]
          );
        } catch {}
      }
      await mongoDb.collection("weather").deleteMany({ session_key: sessionKey });
      await mongoDb.collection("weather").insertMany(weather, { ordered: false });
    }

    // C. Race Control
    if (Array.isArray(rc) && rc.length > 0) {
      const rcRows = rc.map((r) => [
        sessionKey,
        r.date ? String(r.date).slice(0, 19).replace("T", " ") : null,
        r.category || null,
        r.message || null,
        r.flag || null,
        r.scope || null,
      ]);
      if (rcRows.length > 0) {
        try {
          await mysqlPool.query(
            `INSERT IGNORE INTO race_control (session_key, date, category, message, flag, scope) VALUES ?`,
            [rcRows.slice(0, 100)]
          );
        } catch {}
      }
      await mongoDb.collection("race_control").deleteMany({ session_key: sessionKey });
      await mongoDb.collection("race_control").insertMany(rc, { ordered: false });
    }
    console.log(`  ${c.green}✓ Đã nạp Pit stops (${pits?.length || 0}), Weather (${weather?.length || 0}), Race Control (${rc?.length || 0}).${c.reset}`);
  } catch {}

  if (onlyMeta) {
    return { sessionKey, raceName, laps: validLaps.length, telemetry: 0, location: 0 };
  }

  // 5. Ingest Big Data: Telemetry & Location streams directly into MongoDB Atlas for ALL drivers
  const activeDrivers = drivers.filter((d) => d.driver_number != null);
  let driversToCrawl = activeDrivers; // Default: CRAWL ALL DRIVERS
  if (Array.isArray(targetDrivers) && targetDrivers.length > 0) {
    driversToCrawl = activeDrivers.filter((d) => targetDrivers.includes(d.driver_number));
  }

  console.log(
    `\n  📡 ${c.bold}Crawl Cảm biến Big Data (Telemetry & GPS) cho TOÀN BỘ ${driversToCrawl.length} TAY ĐUA lên Atlas...${c.reset}`
  );

  const telemetryCol = mongoDb.collection("telemetry_stream");
  const locationCol = mongoDb.collection("location_stream");
  let telemCount = 0;
  let locCount = 0;

  for (let idx = 0; idx < driversToCrawl.length; idx++) {
    const d = driversToCrawl[idx];
    const drvNum = d.driver_number;
    const name = d.name_acronym || `#${drvNum}`;

    process.stdout.write(`    [${idx + 1}/${driversToCrawl.length}] #${drvNum} ${name}: `);

    // A. car_data (telemetry)
    let curTelem = 0;
    try {
      const carData = await fetchWithRetry(
        `https://api.openf1.org/v1/car_data?session_key=${sessionKey}&driver_number=${drvNum}`
      );
      if (Array.isArray(carData) && carData.length > 0) {
        const docs = carData.map((cd) => ({
          date: new Date(cd.date),
          meta: { session_key: sessionKey, driver_number: drvNum },
          speed: cd.speed ?? 0,
          rpm: cd.rpm ?? 0,
          gear: cd.n_gear ?? 0,
          throttle: cd.throttle ?? 0,
          brake: cd.brake ?? 0,
          drs: cd.drs ?? 0,
        }));
        const CHUNK = 5000;
        for (let i = 0; i < docs.length; i += CHUNK) {
          await telemetryCol.insertMany(docs.slice(i, i + CHUNK), { ordered: false });
        }
        curTelem = docs.length;
        telemCount += docs.length;
      }
    } catch {}

    await sleep(100);

    // B. location (GPS)
    let curLoc = 0;
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
        for (let i = 0; i < docs.length; i += CHUNK) {
          await locationCol.insertMany(docs.slice(i, i + CHUNK), { ordered: false });
        }
        curLoc = docs.length;
        locCount += docs.length;
      }
    } catch {}

    console.log(`${c.green}${curTelem.toLocaleString()} Telem, ${curLoc.toLocaleString()} GPS.${c.reset}`);
    await sleep(150);
  }

  console.log(
    `  ${c.green}✓ Hoàn tất chặng #${sessionKey}: +${telemCount.toLocaleString()} Telemetry & +${locCount.toLocaleString()} GPS documents trên Atlas.${c.reset}`
  );

  return { sessionKey, raceName, laps: validLaps.length, telemetry: telemCount, location: locCount };
}

// Main Runner
export async function runFastCrawler({
  sessionKey = null,
  years = null,
  targetDrivers = null,
  allDrivers = true,
  onlyMeta = false,
} = {}) {
  const t0 = Date.now();
  console.log(`\n${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.white}🏎️  PITWALL MULTI-YEAR CRAWLER & ATLAS UPLOADER${c.reset}`);
  console.log(`${c.dim}Crawl từ OpenF1 API → Đẩy trực tiếp lên MongoDB Atlas Cloud & Aiven MySQL${c.reset}`);
  console.log(`${c.cyan}================================================================${c.reset}\n`);

  process.stdout.write(`📡 Đang thiết lập kết nối an toàn đến MongoDB Atlas & Aiven MySQL... `);
  const [mongoClient, mysqlPool] = await Promise.all([connectMongo(), connectMySQL()]);
  const mongoDb = mongoClient.db("pitwall");
  console.log(`${c.green}✓ Đã kết nối!${c.reset}\n`);

  try {
    let sessionKeysToCrawl = [];

    // Case 1: Specific session
    if (sessionKey) {
      sessionKeysToCrawl = [sessionKey];
    }
    // Case 2: Multi-Year crawl (e.g. 2023, 2024, 2025)
    else if (Array.isArray(years) && years.length > 0) {
      console.log(`🔍 Đang quét danh sách các chặng đua (Race) của các năm: ${years.join(", ")} từ OpenF1...`);
      for (const y of years) {
        try {
          const list = await fetchWithRetry(`https://api.openf1.org/v1/sessions?session_name=Race&year=${y}`);
          if (Array.isArray(list)) {
            const keys = list.map((s) => s.session_key).filter(Boolean);
            console.log(`  - Năm ${y}: ${keys.length} chặng đua.`);
            sessionKeysToCrawl.push(...keys);
          }
        } catch (err) {
          console.log(`  ${c.red}Lỗi lấy danh sách năm ${y}: ${err.message}${c.reset}`);
        }
      }
    } else {
      // Default: Singapore GP 2024
      sessionKeysToCrawl = [DEFAULT_SESSION];
    }

    console.log(`\n🚀 Tổng số chặng sẽ crawl & upload: ${c.bold}${sessionKeysToCrawl.length}${c.reset} chặng.\n`);

    let grandLaps = 0;
    let grandTelemetry = 0;
    let grandLocation = 0;

    for (let i = 0; i < sessionKeysToCrawl.length; i++) {
      const key = sessionKeysToCrawl[i];
      const res = await crawlSingleSession(key, {
        mongoDb,
        mysqlPool,
        targetDrivers,
        allDrivers: true, // Always crawl all drivers
        onlyMeta,
        sessionIndex: i + 1,
        totalSessions: sessionKeysToCrawl.length,
      });

      if (res) {
        grandLaps += res.laps || 0;
        grandTelemetry += res.telemetry || 0;
        grandLocation += res.location || 0;
      }

      await sleep(200);
    }

    // Atlas Database Stats Report
    const [stats, telemTotal, locTotal] = await Promise.all([
      mongoDb.command({ dbStats: 1 }).catch(() => ({})),
      mongoDb.collection("telemetry_stream").countDocuments(),
      mongoDb.collection("location_stream").countDocuments(),
    ]);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const totalNewDocs = grandTelemetry + grandLocation;

    console.log(`\n${c.green}================================================================${c.reset}`);
    console.log(`${c.bold}${c.green}🎉 CRAWL & UPLOAD LÊN MONGODB ATLAS HOÀN TẤT!${c.reset}`);
    console.log(`  ⏱️  Thời gian hoàn thành: ${elapsed} giây`);
    console.log(`  🏁 Tổng chặng đua đã đồng bộ: ${sessionKeysToCrawl.length}`);
    console.log(`  🏎️  Tổng số vòng chạy (Laps) đã nạp: ${grandLaps.toLocaleString()}`);
    console.log(`  📡 Bản ghi Big Data vừa nạp mới: ${totalNewDocs.toLocaleString()}`);
    console.log(`${c.cyan}----------------------------------------------------------------${c.reset}`);
    console.log(`  📊 HIỆN TRẠNG MONGODB ATLAS CLUSTER (pitwall.pa2k7jq.mongodb.net):`);
    console.log(`     • Tổng Telemetry Records trên Atlas: ${c.bold}${telemTotal.toLocaleString()}${c.reset}`);
    console.log(`     • Tổng GPS Location Records trên Atlas: ${c.bold}${locTotal.toLocaleString()}${c.reset}`);
    console.log(`     • Tổng Big Data trên Atlas: ${c.bold}${c.cyan}${(telemTotal + locTotal).toLocaleString()} documents${c.reset}`);
    console.log(`     • Dung lượng lưu trữ trên Atlas: ${(stats.storageSize ? (stats.storageSize / 1024 / 1024).toFixed(2) : "0")} MB / 512 MB Free`);
    console.log(`${c.green}================================================================${c.reset}\n`);
  } finally {
    await mongoClient.close();
    await mysqlPool.end();
  }
}

// CLI Parsing
if (process.argv[1] && process.argv[1].endsWith("fast-crawler.js")) {
  const args = process.argv.slice(2);
  let session = null;
  let years = null;
  let targetDrivers = null;
  let allDrivers = true; // Default ALL drivers
  let onlyMeta = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session" && args[i + 1]) {
      session = Number(args[i + 1]);
      i++;
    } else if (args[i] === "--3years" || args[i] === "--all-years") {
      years = [2023, 2024, 2025];
    } else if (args[i] === "--year" && args[i + 1]) {
      years = [Number(args[i + 1])];
      i++;
    } else if (args[i] === "--years" && args[i + 1]) {
      years = args[i + 1].split(",").map(Number);
      i++;
    } else if (args[i] === "--drivers" && args[i + 1]) {
      targetDrivers = args[i + 1].split(",").map(Number);
      i++;
    } else if (args[i] === "--only-meta") {
      onlyMeta = true;
    } else if (args[i] === "--help") {
      console.log(`
🏎️  HƯỚNG DẪN SỬ DỤNG PITWALL FAST CRAWLER:

1. Crawl toàn bộ 3 năm (2023, 2024, 2025 - ~71 chặng đua):
   npm run crawl:3years
   hoặc: node pitwall-api/fast-crawler.js --3years

2. Crawl 1 chặng đua đầy đủ (tất cả 20 tay đua + cảm biến Big Data + GPS + Pit + Weather):
   npm run crawl
   hoặc: node pitwall-api/fast-crawler.js --session 9606

3. Crawl toàn bộ chặng của 1 năm (ví dụ: 2024):
   npm run crawl:2024
      `);
      process.exit(0);
    } else if (!isNaN(Number(args[i]))) {
      session = Number(args[i]);
    }
  }

  // If no args provided, default to Singapore GP 9606
  if (!session && !years) {
    session = DEFAULT_SESSION;
  }

  runFastCrawler({ sessionKey: session, years, targetDrivers, allDrivers: true, onlyMeta }).catch((err) => {
    console.error(`\n${c.red}Lỗi crawl:${c.reset}`, err);
    process.exit(1);
  });
}
