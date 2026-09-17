import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const SESSION_KEY = 9606;

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || "defaultdb",
  ssl: { rejectUnauthorized: false },
});

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("Session", SESSION_KEY);

  const drivers = await get(`https://api.openf1.org/v1/drivers?session_key=${SESSION_KEY}`);
  for (const d of drivers) {
    if (d.driver_number == null) continue;
    const team = d.team_name || "Unknown";
    await pool.query(`INSERT IGNORE INTO teams (team_name, team_colour) VALUES (?, ?)`, [team, d.team_colour ? `#${d.team_colour}` : null]);
    await pool.query(
      `INSERT INTO drivers (driver_number, name_acronym, full_name, team_name)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name_acronym=VALUES(name_acronym), full_name=VALUES(full_name), team_name=VALUES(team_name)`,
      [d.driver_number, d.name_acronym || String(d.driver_number), d.full_name || d.broadcast_name || "Unknown", team]
    );
  }
  console.log("drivers:", drivers.length);
  await sleep(300);

  const laps = await get(`https://api.openf1.org/v1/laps?session_key=${SESSION_KEY}`);
  let n = 0;
  for (const lap of laps) {
    if (lap.driver_number == null || lap.lap_number == null) continue;
    if (lap.lap_duration == null) continue;
    await pool.query(
      `INSERT INTO laps (session_key, driver_number, lap_number, lap_duration, duration_sector_1, duration_sector_2, duration_sector_3, i1_speed, i2_speed, st_speed, is_pit_out_lap)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE lap_duration=VALUES(lap_duration), duration_sector_1=VALUES(duration_sector_1), duration_sector_2=VALUES(duration_sector_2), duration_sector_3=VALUES(duration_sector_3)`,
      [SESSION_KEY, lap.driver_number, lap.lap_number, lap.lap_duration ?? null, lap.duration_sector_1 ?? null, lap.duration_sector_2 ?? null, lap.duration_sector_3 ?? null, lap.i1_speed ?? null, lap.i2_speed ?? null, lap.st_speed ?? null, lap.is_pit_out_lap ? 1 : 0]
    );
    n++;
    if (n % 100 === 0) { console.log("laps:", n); await sleep(200); }
  }
  console.log("Xong. Tong so lap da pump:", n);
  await pool.end();
}

main().catch((e) => { console.error("Loi:", e); process.exit(1); });
