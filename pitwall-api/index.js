import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { getMongoDb } from "./db-mongo.js";
import { runFastCrawler } from "./fast-crawler.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || "defaultdb",
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});
app.get("/", (_req, res) => {
  res.json({ service: "pitwall-api", ok: true });
});
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.get("/api/leaderboard", async (req, res) => {
  const sessionKey = Number(req.query.session_key || 9601);
  try {
    const [result] = await pool.query("CALL Get_Live_Leaderboard(?)", [
      sessionKey,
    ]);
    const rows =
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/session/:key", async (req, res) => {
  try {
    const [result] = await pool.query("CALL Get_Session_Info(?)", [
      Number(req.params.key),
    ]);
    const rows =
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/laps", async (req, res) => {
  const sessionKey = Number(req.query.session_key || 9601);
  const driver = Number(req.query.driver_number);
  try {
    const [result] = await pool.query("CALL Get_Driver_Lap_History(?, ?)", [
      sessionKey,
      driver,
    ]);
    const rows =
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/session-laps", async (req, res) => {
  const sessionKey = Number(req.query.session_key);
  if (!sessionKey) {
    return res.status(400).json({ error: "session_key required" });
  }
  try {
    const [rows] = await pool.query(
      `SELECT session_key, driver_number, lap_number, lap_duration,
              duration_sector_1, duration_sector_2, duration_sector_3
       FROM laps
       WHERE session_key = ?
       ORDER BY lap_number, driver_number`,
      [sessionKey],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/sessions", async (_req, res) => {
  try {
    let rows;
    try {
      const [r] = await pool.query(
        `SELECT DISTINCT s.session_key, s.session_name, s.session_type,
                m.meeting_name, m.circuit_short_name, m.country_name, m.year
         FROM sessions s
         LEFT JOIN meetings m ON m.meeting_key = s.meeting_key
         ORDER BY m.year DESC, s.session_key`,
      );
      rows = r;
    } catch {
      const [r] = await pool.query(
        `SELECT DISTINCT session_key FROM laps ORDER BY session_key`,
      );
      rows = r;
    }
    if (!rows?.length) {
      const [r] = await pool.query(
        `SELECT DISTINCT session_key FROM laps ORDER BY session_key`,
      );
      rows = r;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bigdata/stats", async (_req, res) => {
  try {
    const db = await getMongoDb();
    const [telemetryCount, locationCount, stats, sessions] = await Promise.all([
      db.collection("telemetry_stream").countDocuments(),
      db.collection("location_stream").countDocuments(),
      db.command({ dbStats: 1 }).catch(() => ({})),
      db
        .collection("sessions")
        .find({})
        .project({ session_key: 1, session_name: 1, country_name: 1, year: 1 })
        .toArray(),
    ]);
    res.json({
      architecture:
        "Polyglot Persistence (MySQL Aiven + MongoDB Atlas Time-Series)",
      telemetry_stream_records: telemetryCount,
      location_stream_records: locationCount,
      total_bigdata_records: telemetryCount + locationCount,
      data_size_kb: Math.round((stats.dataSize || 0) / 1024),
      storage_size_kb: Math.round((stats.storageSize || 0) / 1024),
      compression_ratio:
        stats.dataSize && stats.storageSize
          ? `${(stats.dataSize / stats.storageSize).toFixed(2)}x`
          : "N/A",
      pumped_sessions: sessions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/telemetry/compare", async (req, res) => {
  try {
    const sessionKey = Number(req.query.session_key || 9606);
    const d1 = Number(req.query.d1 || 1);
    const d2 = Number(req.query.d2 || 4);
    const lapNum = Number(req.query.lap || 1);
    const limit = Math.min(Number(req.query.limit || 800), 2000);

    const db = await getMongoDb();

    // 1. Try finding valid lap start time for this specific session
    let lapDoc = await db.collection("laps").findOne({
      session_key: sessionKey,
      lap_number: lapNum,
      date_start: { $ne: null },
    });
    if (!lapDoc) {
      lapDoc = await db.collection("laps").findOne({
        session_key: sessionKey,
        date_start: { $ne: null },
      });
    }

    let minDate = lapDoc?.date_start ? new Date(lapDoc.date_start) : null;

    // 2. If still no date, find first racing point (speed > 40 km/h) for driver 1
    if (!minDate || isNaN(minDate.getTime())) {
      const firstPt = await db.collection("telemetry_stream")
        .find({ "meta.session_key": sessionKey, "meta.driver_number": d1, speed: { $gt: 40 } })
        .sort({ date: 1 })
        .limit(1)
        .toArray();
      if (firstPt.length > 0) {
        minDate = firstPt[0].date;
      }
    }

    const q1 = { "meta.session_key": sessionKey, "meta.driver_number": d1 };
    const q2 = { "meta.session_key": sessionKey, "meta.driver_number": d2 };
    if (minDate) {
      q1.date = { $gte: minDate };
      q2.date = { $gte: minDate };
    }

    let [d1Data, d2Data] = await Promise.all([
      db.collection("telemetry_stream").find(q1).sort({ date: 1 }).limit(limit).toArray(),
      db.collection("telemetry_stream").find(q2).sort({ date: 1 }).limit(limit).toArray(),
    ]);

    // Fallback if empty: query first points for this driver in this session
    if (d1Data.length === 0) {
      d1Data = await db.collection("telemetry_stream")
        .find({ "meta.session_key": sessionKey, "meta.driver_number": d1 })
        .sort({ date: 1 })
        .limit(limit)
        .toArray();
    }
    if (d2Data.length === 0) {
      d2Data = await db.collection("telemetry_stream")
        .find({ "meta.session_key": sessionKey, "meta.driver_number": d2 })
        .sort({ date: 1 })
        .limit(limit)
        .toArray();
    }

    // Live On-Demand Fallback to OpenF1 if MongoDB does not have data for this session yet
    if (d1Data.length === 0) {
      try {
        const of1Res = await fetch(
          `https://api.openf1.org/v1/car_data?session_key=${sessionKey}&driver_number=${d1}`
        );
        if (of1Res.ok) {
          const of1Json = await of1Res.json();
          if (Array.isArray(of1Json) && of1Json.length > 0) {
            d1Data = of1Json.slice(0, limit).map((cd) => ({
              date: new Date(cd.date),
              meta: { session_key: sessionKey, driver_number: d1 },
              speed: cd.speed ?? 0,
              rpm: cd.rpm ?? 0,
              gear: cd.n_gear ?? 0,
              throttle: cd.throttle ?? 0,
              brake: cd.brake ?? 0,
              drs: cd.drs ?? 0,
            }));
            // Cache to Local MongoDB asynchronously
            db.collection("telemetry_stream").insertMany(d1Data, { ordered: false }).catch(() => {});
          }
        }
      } catch (e) {
        console.error("OpenF1 on-demand car_data fetch error:", e.message);
      }
    }

    if (d2Data.length === 0) {
      try {
        const of1Res = await fetch(
          `https://api.openf1.org/v1/car_data?session_key=${sessionKey}&driver_number=${d2}`
        );
        if (of1Res.ok) {
          const of1Json = await of1Res.json();
          if (Array.isArray(of1Json) && of1Json.length > 0) {
            d2Data = of1Json.slice(0, limit).map((cd) => ({
              date: new Date(cd.date),
              meta: { session_key: sessionKey, driver_number: d2 },
              speed: cd.speed ?? 0,
              rpm: cd.rpm ?? 0,
              gear: cd.n_gear ?? 0,
              throttle: cd.throttle ?? 0,
              brake: cd.brake ?? 0,
              drs: cd.drs ?? 0,
            }));
            db.collection("telemetry_stream").insertMany(d2Data, { ordered: false }).catch(() => {});
          }
        }
      } catch (e) {
        console.error("OpenF1 on-demand car_data fetch error (d2):", e.message);
      }
    }

    res.json({
      session_key: sessionKey,
      lap: lapNum,
      start_time: minDate,
      driver1: { driver_number: d1, count: d1Data.length, data: d1Data },
      driver2: { driver_number: d2, count: d2Data.length, data: d2Data },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/track/layout", async (req, res) => {
  try {
    const sessionKey = Number(req.query.session_key || 9606);
    const driver = Number(req.query.driver || 1);
    const lapNum = Number(req.query.lap || 2);
    const db = await getMongoDb();

    // Get lap start time and duration to extract an exact 1-lap closed circuit
    const lapDoc = await db.collection("laps").findOne({
      session_key: sessionKey,
      driver_number: driver,
      lap_number: lapNum,
    });

    let startDate = new Date("2024-09-22T12:05:38.832Z");
    let endDate = new Date("2024-09-22T12:07:18.000Z");

    if (lapDoc?.date_start && lapDoc?.lap_duration) {
      startDate = new Date(lapDoc.date_start);
      endDate = new Date(startDate.getTime() + (lapDoc.lap_duration + 0.5) * 1000);
    }

    let [coords, coordsD2] = await Promise.all([
      db
        .collection("location_stream")
        .find({
          "meta.session_key": sessionKey,
          "meta.driver_number": driver,
          date: { $gte: startDate, $lte: endDate },
        })
        .sort({ date: 1 })
        .project({ x: 1, y: 1, z: 1, date: 1, _id: 0 })
        .toArray(),
      db
        .collection("location_stream")
        .find({
          "meta.session_key": sessionKey,
          "meta.driver_number": 4,
          date: { $gte: startDate, $lte: endDate },
        })
        .sort({ date: 1 })
        .project({ x: 1, y: 1, z: 1, date: 1, _id: 0 })
        .toArray(),
    ]);

    let isFallback = false;

    // If no coordinates found for this exact session window, try any coordinates for this session
    if (coords.length === 0) {
      coords = await db.collection("location_stream")
        .find({ "meta.session_key": sessionKey })
        .sort({ date: 1 })
        .limit(800)
        .project({ x: 1, y: 1, z: 1, date: 1, _id: 0 })
        .toArray();
    }

    // If still 0 (e.g. un-pumped or future session), fallback to Singapore GP 9606 so the track map never displays empty
    if (coords.length === 0) {
      const [sgCoords, sgCoordsD2] = await Promise.all([
        db.collection("location_stream")
          .find({
            "meta.session_key": 9606,
            "meta.driver_number": 1,
            date: { $gte: new Date("2024-09-22T12:05:38.832Z"), $lte: new Date("2024-09-22T12:07:18.000Z") }
          })
          .sort({ date: 1 })
          .project({ x: 1, y: 1, z: 1, date: 1, _id: 0 })
          .toArray(),
        db.collection("location_stream")
          .find({
            "meta.session_key": 9606,
            "meta.driver_number": 4,
            date: { $gte: new Date("2024-09-22T12:05:38.832Z"), $lte: new Date("2024-09-22T12:07:18.000Z") }
          })
          .sort({ date: 1 })
          .project({ x: 1, y: 1, z: 1, date: 1, _id: 0 })
          .toArray(),
      ]);
      coords = sgCoords;
      coordsD2 = sgCoordsD2;
      isFallback = true;
    }

    const s1Duration = lapDoc?.duration_sector_1 || 29.0;
    const s2Duration = lapDoc?.duration_sector_2 || 41.8;
    const totalDur = lapDoc?.lap_duration || 98.8;

    const s1Index = Math.floor((s1Duration / totalDur) * coords.length);
    const s2Index = Math.floor(((s1Duration + s2Duration) / totalDur) * coords.length);

    const sessionDoc = await db.collection("sessions").findOne({ session_key: sessionKey });
    const circuitName = sessionDoc?.circuit_short_name || sessionDoc?.country_name || (sessionKey === 9606 ? "Marina Bay" : `Circuit #${sessionKey}`);
    const countryName = sessionDoc?.country_name || (sessionKey === 9606 ? "Singapore" : "");
    const sessionYear = sessionDoc?.year || 2024;
    const sessionName = sessionDoc?.session_name || "Grand Prix";

    res.json({
      session_key: sessionKey,
      circuit_name: circuitName,
      country_name: countryName,
      year: sessionYear,
      session_name: sessionName,
      lap: lapNum,
      count: coords.length,
      points: coords,
      car2_points: coordsD2,
      is_fallback: isFallback,
      fallback_to: isFallback ? 9606 : null,
      sectors: {
        s1_end_index: s1Index,
        s2_end_index: s2Index,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/replay/frame", async (req, res) => {
  try {
    const sessionKey = Number(req.query.session_key || 9606);
    const timestamp = req.query.timestamp
      ? new Date(req.query.timestamp)
      : null;
    const db = await getMongoDb();

    const match = { "meta.session_key": sessionKey };
    if (timestamp && !isNaN(timestamp.getTime())) {
      match.date = { $lte: timestamp };
    }

    const cars = await db
      .collection("location_stream")
      .aggregate([
        { $match: match },
        { $sort: { date: -1 } },
        {
          $group: {
            _id: "$meta.driver_number",
            date: { $first: "$date" },
            x: { $first: "$x" },
            y: { $first: "$y" },
            z: { $first: "$z" },
          },
        },
        {
          $project: {
            driver_number: "$_id",
            date: 1,
            x: 1,
            y: 1,
            z: 1,
            _id: 0,
          },
        },
      ])
      .toArray();

    res.json({ session_key: sessionKey, cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/crawl", async (req, res) => {
  const sessionKey = Number(req.query.session_key || 9606);
  const targetDrivers = req.query.drivers
    ? req.query.drivers.split(",").map(Number)
    : null;
  const allDrivers = req.query.all === "true";

  res.json({
    status: "started",
    message: `Bat dau fast crawl cho session ${sessionKey} (Polyglot: Aiven MySQL + Mongo Atlas)`,
    session_key: sessionKey,
  });

  runFastCrawler({ sessionKey, targetDrivers, allDrivers }).catch((err) => {
    console.error("[Background Fast Crawl Error]", err);
  });
});

app.get("/api/pump", async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.PUMP_SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  const SESSION_KEY = Number(req.query.session_key);
  if (!SESSION_KEY) {
    return res.status(400).json({ error: "missing session_key" });
  }

  const get = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  };

  async function bulkLaps(rows) {
    const CHUNK = 150;
    let n = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      await pool.query(
        `INSERT INTO laps (
           session_key, driver_number, lap_number, lap_duration,
           duration_sector_1, duration_sector_2, duration_sector_3
         ) VALUES ?
         ON DUPLICATE KEY UPDATE
           lap_duration = VALUES(lap_duration),
           duration_sector_1 = VALUES(duration_sector_1),
           duration_sector_2 = VALUES(duration_sector_2),
           duration_sector_3 = VALUES(duration_sector_3)`,
        [chunk],
      );
      n += chunk.length;
    }
    return n;
  }

  try {
    const sessions = await get(
      `https://api.openf1.org/v1/sessions?session_key=${SESSION_KEY}`,
    );
    const s = Array.isArray(sessions) ? sessions[0] : null;
    if (s) {
      await pool.query(`INSERT IGNORE INTO seasons (year, name) VALUES (?, ?)`, [
        s.year,
        `${s.year} FIA Formula One World Championship`,
      ]);
      await pool.query(
        `INSERT IGNORE INTO meetings (
           meeting_key, year, meeting_name, circuit_short_name, country_name, date_start
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          s.meeting_key,
          s.year,
          `${s.location || s.circuit_short_name || "Meeting"} Grand Prix`,
          s.circuit_short_name || null,
          s.country_name || null,
          s.date_start
            ? String(s.date_start).slice(0, 19).replace("T", " ")
            : null,
        ],
      );
      await pool.query(
        `INSERT IGNORE INTO sessions (
           session_key, meeting_key, session_name, session_type, date_start, total_laps
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          s.session_key,
          s.meeting_key,
          s.session_name || "Race",
          s.session_type || "Race",
          s.date_start
            ? String(s.date_start).slice(0, 19).replace("T", " ")
            : null,
          null,
        ],
      );
    }

    const drivers = await get(
      `https://api.openf1.org/v1/drivers?session_key=${SESSION_KEY}`,
    );
    let driverCount = 0;
    for (const d of drivers) {
      if (d.driver_number == null) continue;
      const team = d.team_name || "Unknown";
      await pool.query(
        `INSERT IGNORE INTO teams (team_name, team_colour) VALUES (?, ?)`,
        [team, d.team_colour || null],
      );
      await pool.query(
        `INSERT INTO drivers (driver_number, name_acronym, full_name, team_name)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name_acronym = VALUES(name_acronym),
           full_name = VALUES(full_name),
           team_name = VALUES(team_name)`,
        [
          d.driver_number,
          d.name_acronym || String(d.driver_number),
          d.full_name || d.broadcast_name || "Unknown",
          team,
        ],
      );
      driverCount++;
    }

    const laps = await get(
      `https://api.openf1.org/v1/laps?session_key=${SESSION_KEY}`,
    );
    const lapRows = [];
    for (const lap of laps) {
      if (lap.driver_number == null || lap.lap_number == null) continue;
      lapRows.push([
        SESSION_KEY,
        lap.driver_number,
        lap.lap_number,
        lap.lap_duration ?? null,
        lap.duration_sector_1 ?? null,
        lap.duration_sector_2 ?? null,
        lap.duration_sector_3 ?? null,
      ]);
    }
    const lapCount = await bulkLaps(lapRows);

    res.json({
      ok: true,
      session_key: SESSION_KEY,
      drivers: driverCount,
      laps: lapCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`pitwall-api listening on ${port}`);
});
