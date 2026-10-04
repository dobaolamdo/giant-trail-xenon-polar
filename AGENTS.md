# PITWALL

Đồ án môn **Cơ sở dữ liệu** — dashboard timing F1 (archive + live).

## Stack

- Frontend: React + Vite + TanStack Start (Vercel)
- Backend API: Express (Render) — `pitwall-api/`
- Database: MySQL (Aiven)
- Data source: OpenF1 API (historical free)

## Chạy local

```bash
npm install
npm run dev
```

## Backend

Xem thư mục `pitwall-api/` — deploy trên Render, env `DATABASE_*` + `PUMP_SECRET`.

## SQL

Schema / trigger / procedure trong thư mục `sql/` (nếu có) hoặc import qua DBeaver vào Aiven.
