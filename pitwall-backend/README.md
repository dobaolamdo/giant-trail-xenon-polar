# Pitwall Backend

Backend Express nối Aiven MySQL với frontend, expose 7 route tương ứng 7 stored procedure.

## Chạy local

```bash
cd server
npm install
cp .env.example .env
# mở .env, điền DB_HOST, DB_PORT, DB_USER, DB_PASSWORD lấy từ Aiven console
npm start
```

Test:
```
http://localhost:3000/api/leaderboard?session_key=9601
```

## Deploy lên Render (free)

1. Push thư mục `server/` này lên 1 repo GitHub (có thể chung repo với frontend, Render sẽ cho chọn "Root Directory").
2. Vào https://render.com → đăng nhập bằng GitHub → **New +** → **Web Service**.
3. Chọn repo, điền:
   - **Root Directory**: `server` (nếu để chung repo với frontend)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Tab **Environment** → thêm các biến giống file `.env`:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - (Render tự cấp `PORT`, không cần set tay)
5. Deploy → chờ build xong → Render cho 1 URL dạng `https://pitwall-backend.onrender.com`
6. Test trên trình duyệt:
   ```
   https://pitwall-backend.onrender.com/api/leaderboard?session_key=9601
   ```
   Ra JSON là xong.

**Lưu ý:** Free tier Render sẽ "ngủ" sau ~15 phút không có traffic, lần gọi đầu tiên sau đó sẽ chậm (~30-50s cold start) — bình thường, không phải lỗi.

## Danh sách route

| Route | Method | Query params | Gọi procedure |
|---|---|---|---|
| `/api/leaderboard` | GET | `session_key` | `Get_Live_Leaderboard` |
| `/api/laps` | GET | `session_key`, `driver_number` | `Get_Driver_Lap_History` |
| `/api/weather` | GET | `session_key` | `Get_Session_Weather` |
| `/api/race-control` | GET | `session_key` | `Get_Race_Control_Feed` |
| `/api/pit-stops` | GET | `session_key` | `Get_Pit_Stops` |
| `/api/session-info` | GET | `session_key` | `Get_Session_Info` |
| `/api/drivers` | GET | `session_key` | `Get_Driver_List` |
