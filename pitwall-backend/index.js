require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// --- Ket noi Aiven MySQL (connection pool, SSL bat buoc) ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper: goi 1 stored procedure va tra ve dong dau tien cua result set dau tien
async function callProcedure(res, sql, params) {
  try {
    const [rows] = await pool.query(sql, params);
    // stored procedure trong mysql2 tra ve mang: rows[0] la result set, rows[1] la OkPacket
    res.json(rows[0] || []);
  } catch (err) {
    console.error('DB error:', err.message);
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
}

// --- Health check (dung de test deploy + tranh cold start sleep neu can) ---
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'pitwall-backend' });
});

// --- 1. Leaderboard live ---
// GET /api/leaderboard?session_key=9601
app.get('/api/leaderboard', (req, res) => {
  const { session_key } = req.query;
  if (!session_key) return res.status(400).json({ error: 'Thieu session_key' });
  callProcedure(res, 'CALL Get_Live_Leaderboard(?)', [session_key]);
});

// --- 2. Lich su lap cua 1 tay dua ---
// GET /api/laps?session_key=9601&driver_number=4
app.get('/api/laps', (req, res) => {
  const { session_key, driver_number } = req.query;
  if (!session_key || !driver_number) {
    return res.status(400).json({ error: 'Thieu session_key hoac driver_number' });
  }
  callProcedure(res, 'CALL Get_Driver_Lap_History(?, ?)', [session_key, driver_number]);
});

// --- 3. Thoi tiet ---
// GET /api/weather?session_key=9601
app.get('/api/weather', (req, res) => {
  const { session_key } = req.query;
  if (!session_key) return res.status(400).json({ error: 'Thieu session_key' });
  callProcedure(res, 'CALL Get_Session_Weather(?)', [session_key]);
});

// --- 4. Race control feed ---
// GET /api/race-control?session_key=9601
app.get('/api/race-control', (req, res) => {
  const { session_key } = req.query;
  if (!session_key) return res.status(400).json({ error: 'Thieu session_key' });
  callProcedure(res, 'CALL Get_Race_Control_Feed(?)', [session_key]);
});

// --- 5. Pit stops ---
// GET /api/pit-stops?session_key=9601
app.get('/api/pit-stops', (req, res) => {
  const { session_key } = req.query;
  if (!session_key) return res.status(400).json({ error: 'Thieu session_key' });
  callProcedure(res, 'CALL Get_Pit_Stops(?)', [session_key]);
});

// --- 6. Thong tin session ---
// GET /api/session-info?session_key=9601
app.get('/api/session-info', (req, res) => {
  const { session_key } = req.query;
  if (!session_key) return res.status(400).json({ error: 'Thieu session_key' });
  callProcedure(res, 'CALL Get_Session_Info(?)', [session_key]);
});

// --- 7. Danh sach tay dua trong session ---
// GET /api/drivers?session_key=9601
app.get('/api/drivers', (req, res) => {
  const { session_key } = req.query;
  if (!session_key) return res.status(400).json({ error: 'Thieu session_key' });
  callProcedure(res, 'CALL Get_Driver_List(?)', [session_key]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Pitwall backend chay tai port ${PORT}`);
});
