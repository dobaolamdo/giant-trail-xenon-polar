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
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
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
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
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
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`pitwall-api listening on ${port}`);
});