// PITWALL backend · Node + mysql2
// Việc duy nhất: nhận HTTP → CALL procedure → trả JSON đúng cột frontend.
// Không viết SQL rải trong route. Không SELECT thẳng bảng từ frontend.

import express from "express";
import mysql from "mysql2/promise";

const db = await mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: "pitwall",
  namedPlaceholders: true,
});

const app = express();

async function call(name, params = []) {
  const [rows] = await db.query(`CALL ${name}(${params.map(() => "?").join(",")})`, params);
  // mysql2 trả [resultset, extra] cho CALL
  return Array.isArray(rows[0]) ? rows[0] : rows;
}

// Live timing
app.get("/api/leaderboard", async (req, res) => {
  res.json(await call("Get_Live_Leaderboard", [Number(req.query.session_key)]));
});
app.get("/api/laps", async (req, res) => {
  res.json(
    await call("Get_Driver_Lap_History", [
      Number(req.query.session_key),
      Number(req.query.driver_number),
    ]),
  );
});
app.get("/api/weather", async (req, res) => {
  res.json(await call("Get_Session_Weather", [Number(req.query.session_key)]));
});
app.get("/api/race-control", async (req, res) => {
  res.json(
    await call("Get_Race_Control_Feed", [Number(req.query.session_key), req.query.since]),
  );
});
app.get("/api/pits", async (req, res) => {
  res.json(await call("Get_Pit_Stops", [Number(req.query.session_key)]));
});
app.get("/api/session", async (req, res) => {
  const rows = await call("Get_Session_Info", [Number(req.query.session_key)]);
  res.json(rows[0] ?? null);
});
app.get("/api/drivers", async (req, res) => {
  res.json(await call("Get_Driver_List", [Number(req.query.session_key)]));
});

// Archive / championship
app.get("/api/seasons", async (_req, res) => {
  res.json(await call("Get_Seasons"));
});
app.get("/api/meetings", async (req, res) => {
  res.json(await call("Get_Season_Meetings", [Number(req.query.year)]));
});
app.get("/api/result", async (req, res) => {
  res.json(await call("Get_Race_Result", [Number(req.query.session_key)]));
});
app.get("/api/standings/drivers", async (req, res) => {
  res.json(await call("Get_Driver_Standings", [Number(req.query.year)]));
});
app.get("/api/standings/constructors", async (req, res) => {
  res.json(await call("Get_Constructor_Standings", [Number(req.query.year)]));
});

// Data pump (OpenF1 → raw INSERT). Trigger tự chạy.
app.post("/api/ingest/lap", express.json(), async (req, res) => {
  const b = req.body;
  await db.query(
    `INSERT INTO laps
      (session_key, driver_number, lap_number, duration_sector_1, duration_sector_2,
       duration_sector_3, lap_duration, compound, is_pit_out_lap, ts)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      b.session_key, b.driver_number, b.lap_number,
      b.duration_sector_1, b.duration_sector_2, b.duration_sector_3,
      b.lap_duration, b.compound, b.is_pit_out_lap ? 1 : 0, b.ts,
    ],
  );
  res.json({ ok: true });
});

app.listen(Number(process.env.PORT) || 3001);
