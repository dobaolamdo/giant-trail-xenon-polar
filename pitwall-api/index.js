import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

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
  connectionLimit: 5,
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

// Danh sách session đã có data (cho Archive)
app.get("/api/sessions", async (req, res) => {
  const year = Number(req.query.year || 2024);
  try {
    const [rows] = await pool.query(
      `
      SELECT
        s.session_key,
        s.session_name,
        s.session_type,
        s.date_start,
        s.meeting_key,
        m.meeting_name,
        m.circuit_short_name,
        m.country_name,
        m.year
      FROM sessions s
      INNER JOIN (
        SELECT DISTINCT session_key FROM laps
      ) x ON x.session_key = s.session_key
      LEFT JOIN meetings m ON m.meeting_key = s.meeting_key
      WHERE (? IS NULL OR m.year = ? OR m.year IS NULL)
      ORDER BY s.date_start IS NULL, s.date_start, s.session_key
      `,
      [year || null, year || null],
    );

    if (rows.length > 0) {
      return res.json(rows);
    }

    // Fallback: chỉ có laps, chưa join được meetings
    const [keys] = await pool.query(
      `SELECT DISTINCT session_key FROM laps ORDER BY session_key`,
    );
    res.json(keys);
  } catch (err) {
    console.error(err);
    try {
      const [keys] = await pool.query(
        `SELECT DISTINCT session_key FROM laps ORDER BY session_key`,
      );
      res.json(keys);
    } catch (err2) {
      res.status(500).json({ error: err2.message });
    }
  }
});

// Pump OpenF1 historical → Aiven
app.get("/api/pump", async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.PUMP_SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  const SESSION_KEY = Number(req.query.session_key);
  if (!SESSION_KEY) {
    return res.status(400).json({ error: "missing session_key" });
  }

  try {
    const get = async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r.json();
    };

    const sessions = await get(
      `https://api.openf1.org/v1/sessions?session_key=${SESSION_KEY}`,
    );
    const s = Array.isArray(sessions) ? sessions[0] : null;
    if (s) {
      await pool.query(
        `INSERT IGNORE INTO seasons (year, name) VALUES (?, ?)`,
        [s.year, `${s.year} FIA Formula One World Championship`],
      );
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
    let lapCount = 0;
    for (const lap of laps) {
      if (lap.driver_number == null || lap.lap_number == null) continue;
      await pool.query(
        `INSERT INTO laps (
           session_key, driver_number, lap_number, lap_duration,
           duration_sector_1, duration_sector_2, duration_sector_3
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           lap_duration = VALUES(lap_duration),
           duration_sector_1 = VALUES(duration_sector_1),
           duration_sector_2 = VALUES(duration_sector_2),
           duration_sector_3 = VALUES(duration_sector_3)`,
        [
          SESSION_KEY,
          lap.driver_number,
          lap.lap_number,
          lap.lap_duration ?? null,
          lap.duration_sector_1 ?? null,
          lap.duration_sector_2 ?? null,
          lap.duration_sector_3 ?? null,
        ],
      );
      lapCount++;
    }

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
