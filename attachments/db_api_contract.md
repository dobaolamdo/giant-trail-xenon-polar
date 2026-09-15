# HỢP ĐỒNG DỮ LIỆU (DB API CONTRACT)
### F1 Live Timing Dashboard — thống nhất với cả nhóm trước khi ai bắt đầu code

## Nguyên tắc bắt buộc

1. **Backend KHÔNG BAO GIỜ query trực tiếp vào bảng gốc** (`laps`, `positions`, `intervals`...).
   Backend chỉ được gọi các **View / Stored Procedure** liệt kê dưới đây.
2. Đội DB (DBA Architect + DBA Logic) **được toàn quyền** thiết kế lại bảng, tách bảng,
   đổi tên cột, chuẩn hoá lại... bên trong, miễn là:
   - Tên Procedure/View giữ nguyên
   - Tham số đầu vào giữ nguyên (tên + kiểu dữ liệu)
   - Cột đầu ra giữ nguyên (tên + kiểu dữ liệu + thứ tự không bắt buộc nhưng tên phải khớp)
3. Nếu đội DB cần đổi 1 trong 3 điều trên → phải báo trước cho người giữ Backend,
   không tự ý đổi ngầm.
4. Muốn thêm cột/procedure mới thì thoải mái — chỉ không được XOÁ hoặc ĐỔI TÊN
   những gì Backend đang phụ thuộc.

---

## Danh sách Procedure / View cần có

### 1. `Get_Live_Leaderboard(session_key)`
Bảng xếp hạng trực tiếp — Frontend gọi mỗi giây.
| Cột trả về | Kiểu | Ghi chú |
|---|---|---|
| live_rank | INT | Thứ hạng hiện tại |
| driver_number | INT | |
| full_name | VARCHAR | |
| team_name | VARCHAR | |
| team_colour | VARCHAR | mã hex, để tô màu thẻ |
| gap_to_leader | DECIMAL | giây, NULL nếu là leader |
| gap_to_car_ahead | DECIMAL | giây |

### 2. `Get_Driver_Lap_History(session_key, driver_number)`
Lịch sử từng lap của 1 tay đua — dùng khi Frontend click vào 1 xe để xem chi tiết.
| Cột trả về | Kiểu |
|---|---|
| lap_number | INT |
| lap_duration | DECIMAL |
| duration_sector_1/2/3 | DECIMAL |
| is_purple_s1/2/3 | BOOLEAN |
| compound | VARCHAR |
| is_pit_out_lap | BOOLEAN |

### 3. `Get_Session_Weather(session_key)`
Thời tiết mới nhất — cập nhật icon góc dashboard.
| Cột trả về | Kiểu |
|---|---|
| air_temperature | DECIMAL |
| track_temperature | DECIMAL |
| humidity | DECIMAL |
| rainfall | BOOLEAN |
| wind_speed | DECIMAL |
| date | DATETIME |

### 4. `Get_Race_Control_Feed(session_key, since_date)`
Ticker tin tức đường đua (cờ, safety car, phạt...) — Frontend poll lấy tin mới từ `since_date`.
| Cột trả về | Kiểu |
|---|---|
| date | DATETIME |
| category | VARCHAR |
| flag | VARCHAR |
| scope | VARCHAR |
| driver_number | INT (nullable) |
| message | VARCHAR |

### 5. `Get_Pit_Stops(session_key)`
Danh sách pit stop trong session — hiển thị bảng phụ.
| Cột trả về | Kiểu |
|---|---|
| driver_number | INT |
| full_name | VARCHAR |
| lap_number | INT |
| stop_duration | DECIMAL |
| lane_duration | DECIMAL |

### 6. `Get_Session_Info(session_key)`
Thông tin chặng đua hiện tại — hiển thị tiêu đề dashboard.
| Cột trả về | Kiểu |
|---|---|
| meeting_name | VARCHAR |
| session_name | VARCHAR |
| circuit_short_name | VARCHAR |
| country_name | VARCHAR |
| date_start | DATETIME |
| date_end | DATETIME |

### 7. `Get_Driver_List(session_key)`
Danh sách tay đua + ảnh + màu team — dùng để vẽ danh sách chọn xe theo dõi.
| Cột trả về | Kiểu |
|---|---|
| driver_number | INT |
| full_name | VARCHAR |
| team_name | VARCHAR |
| team_colour | VARCHAR |
| headshot_url | VARCHAR |

---

## Cách dùng trong thực tế

- Backend code chỉ viết duy nhất 1 lớp gọi DB (VD `LeaderboardRepository.java`) —
  bên trong chỉ có `CALL Get_Live_Leaderboard(?)`, không có logic SQL phức tạp nào khác.
- Nếu nhóm DB đổi hẳn cách lưu trữ (ví dụ tách `laps` thành `lap_sectors` riêng),
  họ chỉ cần sửa lại **bên trong** procedure `Get_Driver_Lap_History` sao cho
  vẫn trả đúng 7 cột như bảng trên — Backend/Frontend của ông không đụng vào.
- Khuyến nghị: bản `f1_schema.sql` đã gửi trước đã có sẵn `Get_Live_Leaderboard`
  đúng theo hợp đồng này — làm nền để bổ sung 6 procedure còn lại.
