/**
 * Thin PITWALL API for the TV Box.
 * Only CALL procedures — never SELECT lap/live_car from here.
 *
 *   npm i mysql2
 *   MYSQL_URL=mysql://pitwall:secret@127.0.0.1:3306/pitwall node server.mjs
 *
 * Demo frontend keeps using in-memory Get_* until you point it at these URLs.
 */
import http from "node:http";
import mysql from "mysql2/promise";

const pool = mysql.createPool(process.env.MYSQL_URL ?? "mysql://root@127.0.0.1/pitwall");
const PORT = Number(process.env.PORT ?? 3001);

async function call(name, args = []) {
  const ph = args.map(() => "?").join(", ");
  const [rows] = await pool.query(`CALL ${name}(${ph})`, args);
  return Array.isArray(rows) ? rows[0] : rows;
}

const routes = [
  ["GET", /^\/api\/seasons$/, () => call("Get_Seasons")],
  ["GET", /^\/api\/seasons\/(\d+)\/meetings$/, (m) => call("Get_Season_Meetings", [m[1]])],
  ["GET", /^\/api\/seasons\/(\d+)\/standings\/drivers$/, (m) => call("Get_Driver_Standings", [m[1]])],
  ["GET", /^\/api\/seasons\/(\d+)\/standings\/constructors$/, (m) => call("Get_Constructor_Standings", [m[1]])],
  ["GET", /^\/api\/sessions\/(\d+)\/leaderboard$/, (m) => call("Get_Live_Leaderboard", [m[1]])],
  ["GET", /^\/api\/sessions\/(\d+)\/laps\/(\d+)$/, (m) => call("Get_Driver_Lap_History", [m[1], m[2]])],
  ["GET", /^\/api\/sessions\/(\d+)\/weather$/, (m) => call("Get_Session_Weather", [m[1]])],
  ["GET", /^\/api\/sessions\/(\d+)\/race-control$/, (m) => call("Get_Race_Control_Feed", [m[1], m.query.since ?? "1970-01-01"])],
  ["GET", /^\/api\/sessions\/(\d+)\/pits$/, (m) => call("Get_Pit_Stops", [m[1]])],
  ["GET", /^\/api\/sessions\/(\d+)\/info$/, (m) => call("Get_Session_Info", [m[1]])],
  ["GET", /^\/api\/sessions\/(\d+)\/drivers$/, (m) => call("Get_Driver_List", [m[1]])],
  ["GET", /^\/api\/sessions\/(\d+)\/result$/, (m) => call("Get_Race_Result", [m[1]])],
  ["GET", /^\/api\/sessions\/(\d+)\/trace$/, (m) => call("Get_Derived_Events", [m[1]])],
];

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url ?? "/", "http://x");
  for (const [method, re, fn] of routes) {
    if (req.method !== method) continue;
    const m = url.pathname.match(re);
    if (!m) continue;
    m.query = Object.fromEntries(url.searchParams);
    try {
      const data = await fn(m);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err.message ?? err) }));
    }
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`pitwall api on :${PORT}`);
});
