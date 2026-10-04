# PITWALL

Dashboard theo dõi đua F1 — archive playback, live timing, MySQL trigger/procedure.

**Môn:** Cơ sở dữ liệu  
**Nhóm:** đồ án sinh viên

## Tính năng

- Calendar session (FP1 / FP2 / FP3 / Qualifying / Race) từ OpenF1
- Leaderboard (DNF xuống cuối), gap, điểm
- Kết nối MySQL: trigger purple sector, stored procedure ranking
- Live / post-session: session Baku 2026 (`session_key=11377`)

## Cấu trúc

| Thư mục | Nội dung |
|---------|----------|
| `src/` | Frontend React |
| `pitwall-api/` | API Express + pump OpenF1 |
| `sql/` | Script schema (nếu có) |

## Deploy

- Frontend → Vercel (repo này)
- API → Render (`pitwall-api`)
- DB → Aiven MySQL

```bash
npm install
npm run build
```
