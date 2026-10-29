# 🏁 PITWALL — F1 Big Data Telemetry & Hybrid Database Platform

> **Đồ án môn Cơ sở dữ liệu (Database Systems Project)**  
> **Kiến trúc dữ liệu lai (Polyglot Persistence):** Aiven Cloud MySQL (OLTP) + Local MongoDB (OLAP / Big Data)  
> **Tài liệu báo cáo chi tiết:** [docs/REPORT_PITWALL_BIGDATA.md](docs/REPORT_PITWALL_BIGDATA.md)

---

## 🌟 Giới thiệu

**PITWALL** là hệ thống viễn trắc (telemetry) và bảng tính giờ F1 thời gian thực, tái hiện giao diện chỉ huy chiến thuật MultiViewer của các kỹ sư đội đua F1 (Ferrari, Mercedes, Red Bull Racing). 

Hệ thống xử lý bài toán **Big Data thực tế** với khối lượng dữ liệu khổng lồ:
- Hơn **100.000.000 bản ghi cảm biến** viễn trắc (tốc độ, vòng tua máy, chân ga, chân phanh, cánh gió DRS, dung lượng pin hybrid).
- Tần số cảm biến phát sóng từ **3.7 Hz đến hơn 100 Hz**.
- Quản lý **71 chặng đua lịch sử 3 mùa giải (2023, 2024, 2025)** cùng chặng thử nghiệm quy chuẩn kỹ thuật **F1 2026 (Baku GP Demo)**.

---

## 🏗️ Kiến trúc Cơ sở dữ liệu lai (Hybrid Architecture)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        KIẾN TRÚC LAI (POLYGLOT PERSISTENCE)                            │
│                                                                                        │
│   [NGIỆP VỤ & TÍNH ĐIỂM]                                [BIG DATA CẢM BIẾN]            │
│   Aiven Cloud MySQL (Port 3306)                         Local MongoDB (Ổ D: Port 27017) │
│   ─────────────────────────────                         ─────────────────────────────── │
│   • Ràng buộc toàn vẹn ACID, Foreign Keys               • Không giới hạn dung lượng     │
│   • Bậc chuẩn 3NF (Normal Form)                         • Tốc độ ghi: >13.500 docs/giây │
│   • Chạy Stored Procedures:                             • WiredTiger Engine, Snappy comp│
│     - Call Get_Live_Leaderboard()                       • Time-Series Telemetry Stream  │
│     - Call Get_Driver_Lap_History()                     • Bản đồ GPS 2D: X, Y, Z coords │
│     - Call Get_Stints() / Get_Pit_Stops()               • Cảm biến F1 2026: MOM, Battery│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Phân công vai trò giữa 2 hệ quản trị:
1. **Aiven Cloud MySQL (RDBMS):**
   - Đảm bảo tính toàn vẹn tham chiếu (ACID), mô hình hóa quan hệ chuẩn 3NF cho: `drivers`, `teams`, `seasons`, `meetings`, `sessions`, `laps`, `stints`, `pit_stops`.
   - Thực thi các **Stored Procedures** và **Window Functions** (`FIRST_VALUE`, `ROW_NUMBER() OVER`) để tính khoảng cách `gap_to_leader` và xếp hạng trực tiếp.
2. **Local MongoDB (NoSQL Document Store):**
   - Lưu trữ chuỗi thời gian (Time-series) của hơn 100 triệu cảm biến thô.
   - Sử dụng **WiredTiger Engine** với nén **Snappy** giúp giảm $30\text{ GB}$ dữ liệu xuống còn ~$7\text{ GB}$ lưu tại ổ đĩa `D:\pitwall-mongodb`.
   - Xây dựng **Compound Index theo quy tắc ESR (Equality, Sort, Range)** `{ "meta.session_key": 1, "meta.driver_number": 1, "date": 1 }`, đưa thời gian truy vấn đồ thị từ $12.430\text{ ms}$ xuống **dưới $4\text{ ms}$**.

---

## ⚡ Điểm nhấn công nghệ F1 2026 & Super Clipping

- **Quy chuẩn 2026:** Động cơ điện MGU-K nâng cấp lên **$350\text{ kW}$ ($~475\text{ HP}$)**, loại bỏ DRS và thay bằng khí động học chủ động **Active Aero (Z-Mode bám cua, X-Mode đoạn thẳng)** cùng chế độ vượt **MOM (Manual Override Mode)**.
- **Mô phỏng Super Clipping:** Tự động phát hiện khi xe chạy $>310\text{ km/h}$ trên đoạn thẳng nhưng mức pin tụt $<16\%$. MGU-K ngắt đột ngột về $0\text{ kW}$, hãm đứng tốc độ xe trước điểm phanh và kích hoạt cảnh báo trực quan trên Dashboard.

---

## 🚀 Hướng dẫn cài đặt & Chạy cục bộ (Local Development)

### 1. Yêu cầu môi trường
- Node.js $\ge 18$
- MongoDB $\ge 7.0$ (Cài đặt tại thư mục `D:\pitwall-mongodb`)
- Tài khoản MySQL Aiven Cloud

### 2. Khởi động hệ thống
```bash
# 1. Khởi động MongoDB Local trên Ổ D:
& "D:\pitwall-mongodb\bin\mongod.exe" --dbpath "D:\pitwall-mongodb\data" --logpath "D:\pitwall-mongodb\logs\mongod.log" --port 27017 --bind_ip 127.0.0.1

# 2. Cài đặt thư viện
npm install
cd pitwall-api && npm install && cd ..

# 3. Khởi động Backend API (Port 3001)
node pitwall-api/index.js

# 4. Khởi động Frontend Dashboard (Port 8080)
npm run dev
```

Truy cập trình duyệt: [http://localhost:8080](http://localhost:8080)

### 3. Lệnh cào Big Data (Maxping 3 năm)
```bash
npm run crawl:maxping:3years
```

---

## 📂 Cấu trúc mã nguồn

```
├── docs/
│   └── REPORT_PITWALL_BIGDATA.md    # Báo cáo kỹ thuật CSDL & Big Data chuyên sâu
├── pitwall-api/                     # Express Backend Server (Port 3001)
│   ├── db-mongo.js                  # Module kết nối MongoDB Local ổ D:
│   ├── maxping-crawler.js           # Bộ cào Big Data xử lý Rate-limit & BulkWrite
│   ├── fast-crawler.js              # Bộ cào nhanh đa luồng
│   └── index.js                     # REST API endpoints (MySQL Stored Procs + MongoDB)
├── src/                             # Frontend React 19 + TanStack Start (Port 8080)
│   ├── components/pitwall/
│   │   ├── shell.tsx                # Single Source of Truth physics & synchronization
│   │   ├── leaderboard.tsx          # MultiViewer Timing Tower (S1/S2/S3 purple/green)
│   │   ├── track-map.tsx            # Bản đồ 2D Vector GPS toạ độ thực
│   │   ├── cockpit-gauge.tsx        # Đồng hồ tay lái FIA F1 TV Broadcast style
│   │   ├── driver-detail.tsx        # Chi tiết tay đua & Cảnh báo Super Clipping 2026
│   │   ├── telemetry-compare.tsx    # So sánh đồ thị sóng tốc độ/ga/phanh 2 xe
│   │   └── schema-view.tsx          # Trình duyệt tài liệu CSDL tương tác 6 tab
└── README.md
```

---

## 👥 Nhóm thực hiện & Giấy phép
- Đồ án môn **Cơ sở dữ liệu** — Đại học.
- Giấy phép: MIT License.
