-- PITWALL · MySQL 8  ·  import file này trên máy chạy MySQL
-- Frontend KHÔNG đụng bảng. Chỉ gọi đúng các procedure bên dưới.

CREATE DATABASE IF NOT EXISTS pitwall
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE pitwall;

-- ─── 1. BẢNG GỐC ───────────────────────────────────────────

CREATE TABLE season (
  year          SMALLINT PRIMARY KEY,
  name          VARCHAR(80) NOT NULL,
  status        ENUM('complete','in_progress') NOT NULL
);

CREATE TABLE team (
  team_id       INT AUTO_INCREMENT PRIMARY KEY,
  team_name     VARCHAR(60) NOT NULL UNIQUE,
  team_colour   CHAR(6) NOT NULL
);

CREATE TABLE driver (
  driver_number SMALLINT PRIMARY KEY,
  full_name     VARCHAR(80) NOT NULL,
  code          CHAR(3) NOT NULL,
  headshot_url  VARCHAR(255) NOT NULL DEFAULT ''
);

-- Tay đua đổi đội theo mùa (2024 Hamilton Mercedes, 2025 Ferrari)
CREATE TABLE driver_season (
  year          SMALLINT NOT NULL,
  driver_number SMALLINT NOT NULL,
  team_id       INT NOT NULL,
  PRIMARY KEY (year, driver_number),
  FOREIGN KEY (year) REFERENCES season(year),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number),
  FOREIGN KEY (team_id) REFERENCES team(team_id)
);

CREATE TABLE circuit (
  circuit_id    INT AUTO_INCREMENT PRIMARY KEY,
  short_name    VARCHAR(40) NOT NULL,
  country_name  VARCHAR(40) NOT NULL
);

CREATE TABLE meeting (
  meeting_key   INT PRIMARY KEY,
  year          SMALLINT NOT NULL,
  round         TINYINT NOT NULL,
  circuit_id    INT NOT NULL,
  meeting_name  VARCHAR(80) NOT NULL,
  date_start    DATETIME NOT NULL,
  status        ENUM('live','complete','upcoming') NOT NULL,
  UNIQUE (year, round),
  FOREIGN KEY (year) REFERENCES season(year),
  FOREIGN KEY (circuit_id) REFERENCES circuit(circuit_id)
);

CREATE TABLE session (
  session_key   INT PRIMARY KEY,
  meeting_key   INT NOT NULL,
  session_name  VARCHAR(20) NOT NULL DEFAULT 'Race',
  date_start    DATETIME NOT NULL,
  date_end      DATETIME NOT NULL,
  FOREIGN KEY (meeting_key) REFERENCES meeting(meeting_key)
);

CREATE TABLE session_entry (
  session_key   INT NOT NULL,
  driver_number SMALLINT NOT NULL,
  status        ENUM('RUNNING','PIT','OUT','DNF','SC') NOT NULL DEFAULT 'RUNNING',
  PRIMARY KEY (session_key, driver_number),
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number)
);

-- RAW: data pump chỉ INSERT dòng này. Không ghi is_purple.
CREATE TABLE laps (
  lap_id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key         INT NOT NULL,
  driver_number       SMALLINT NOT NULL,
  lap_number          SMALLINT NOT NULL,
  duration_sector_1   DECIMAL(8,3) NOT NULL,
  duration_sector_2   DECIMAL(8,3) NOT NULL,
  duration_sector_3   DECIMAL(8,3) NOT NULL,
  lap_duration        DECIMAL(8,3) NOT NULL,
  compound            ENUM('SOFT','MEDIUM','HARD','INTERMEDIATE','WET') NOT NULL,
  is_pit_out_lap      TINYINT(1) NOT NULL DEFAULT 0,
  ts                  DATETIME(3) NOT NULL,
  UNIQUE (session_key, driver_number, lap_number),
  INDEX (session_key, lap_number),
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number)
);

-- DERIVED: trigger ghi vào đây, không UPDATE laps (tránh lỗi mutating table)
CREATE TABLE session_best (
  session_key   INT NOT NULL,
  kind          ENUM('S1','S2','S3','LAP') NOT NULL,
  driver_number SMALLINT NOT NULL,
  lap_number    SMALLINT NOT NULL,
  duration      DECIMAL(8,3) NOT NULL,
  updated_at    DATETIME(3) NOT NULL,
  PRIMARY KEY (session_key, kind),
  FOREIGN KEY (session_key) REFERENCES session(session_key)
);

CREATE TABLE pit_stop (
  pit_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key   INT NOT NULL,
  driver_number SMALLINT NOT NULL,
  lap_number    SMALLINT NOT NULL,
  stop_duration DECIMAL(6,3) NOT NULL,
  lane_duration DECIMAL(6,3) NOT NULL,
  INDEX (session_key),
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number)
);

CREATE TABLE race_control (
  rc_id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key   INT NOT NULL,
  ts            DATETIME(3) NOT NULL,
  category      VARCHAR(40) NOT NULL,
  flag          VARCHAR(20) NOT NULL DEFAULT '',
  scope         VARCHAR(20) NOT NULL DEFAULT 'Track',
  driver_number SMALLINT NULL,
  message       VARCHAR(255) NOT NULL,
  INDEX (session_key, ts),
  FOREIGN KEY (session_key) REFERENCES session(session_key)
);

CREATE TABLE weather (
  weather_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key         INT NOT NULL,
  ts                  DATETIME(3) NOT NULL,
  air_temperature     DECIMAL(4,1) NOT NULL,
  track_temperature   DECIMAL(4,1) NOT NULL,
  humidity            DECIMAL(4,1) NOT NULL,
  rainfall            TINYINT(1) NOT NULL DEFAULT 0,
  wind_speed          DECIMAL(4,1) NOT NULL,
  INDEX (session_key, ts),
  FOREIGN KEY (session_key) REFERENCES session(session_key)
);

CREATE TABLE race_result (
  session_key   INT NOT NULL,
  position      TINYINT NOT NULL,
  driver_number SMALLINT NOT NULL,
  gap_to_leader DECIMAL(8,3) NULL,
  points        DECIMAL(5,1) NOT NULL DEFAULT 0,
  status        ENUM('Classified','DNF') NOT NULL,
  laps          SMALLINT NOT NULL,
  fastest_lap   TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (session_key, position),
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number)
);

-- ─── 2. TRIGGER (chấm điểm CSDL) ───────────────────────────
-- Mỗi INSERT laps: nếu sector/lap mới < min hiện tại → ghi session_best.

DELIMITER $$

CREATE TRIGGER trg_laps_session_best
AFTER INSERT ON laps
FOR EACH ROW
BEGIN
  IF NEW.is_pit_out_lap = 0 THEN
    INSERT INTO session_best (session_key, kind, driver_number, lap_number, duration, updated_at)
    VALUES (NEW.session_key, 'S1', NEW.driver_number, NEW.lap_number, NEW.duration_sector_1, NEW.ts)
    ON DUPLICATE KEY UPDATE
      driver_number = IF(NEW.duration_sector_1 < duration, NEW.driver_number, driver_number),
      lap_number    = IF(NEW.duration_sector_1 < duration, NEW.lap_number, lap_number),
      duration      = IF(NEW.duration_sector_1 < duration, NEW.duration_sector_1, duration),
      updated_at    = IF(NEW.duration_sector_1 < duration, NEW.ts, updated_at);

    INSERT INTO session_best (session_key, kind, driver_number, lap_number, duration, updated_at)
    VALUES (NEW.session_key, 'S2', NEW.driver_number, NEW.lap_number, NEW.duration_sector_2, NEW.ts)
    ON DUPLICATE KEY UPDATE
      driver_number = IF(NEW.duration_sector_2 < duration, NEW.driver_number, driver_number),
      lap_number    = IF(NEW.duration_sector_2 < duration, NEW.lap_number, lap_number),
      duration      = IF(NEW.duration_sector_2 < duration, NEW.duration_sector_2, duration),
      updated_at    = IF(NEW.duration_sector_2 < duration, NEW.ts, updated_at);

    INSERT INTO session_best (session_key, kind, driver_number, lap_number, duration, updated_at)
    VALUES (NEW.session_key, 'S3', NEW.driver_number, NEW.lap_number, NEW.duration_sector_3, NEW.ts)
    ON DUPLICATE KEY UPDATE
      driver_number = IF(NEW.duration_sector_3 < duration, NEW.driver_number, driver_number),
      lap_number    = IF(NEW.duration_sector_3 < duration, NEW.lap_number, lap_number),
      duration      = IF(NEW.duration_sector_3 < duration, NEW.duration_sector_3, duration),
      updated_at    = IF(NEW.duration_sector_3 < duration, NEW.ts, updated_at);

    INSERT INTO session_best (session_key, kind, driver_number, lap_number, duration, updated_at)
    VALUES (NEW.session_key, 'LAP', NEW.driver_number, NEW.lap_number, NEW.lap_duration, NEW.ts)
    ON DUPLICATE KEY UPDATE
      driver_number = IF(NEW.lap_duration < duration, NEW.driver_number, driver_number),
      lap_number    = IF(NEW.lap_duration < duration, NEW.lap_number, lap_number),
      duration      = IF(NEW.lap_duration < duration, NEW.lap_duration, duration),
      updated_at    = IF(NEW.lap_duration < duration, NEW.ts, updated_at);
  END IF;
END$$

-- ─── 3. PROCEDURE = đúng cột frontend đang đọc ─────────────

CREATE PROCEDURE Get_Live_Leaderboard(IN p_session_key INT)
BEGIN
  WITH totals AS (
    SELECT
      l.driver_number,
      SUM(l.lap_duration) AS cumulative,
      MAX(l.lap_number) AS laps_done,
      SUBSTRING_INDEX(GROUP_CONCAT(l.compound ORDER BY l.lap_number DESC), ',', 1) AS compound,
      CAST(SUBSTRING_INDEX(GROUP_CONCAT(l.lap_duration ORDER BY l.lap_number DESC), ',', 1) AS DECIMAL(8,3)) AS last_lap
    FROM laps l
    WHERE l.session_key = p_session_key
    GROUP BY l.driver_number
  ),
  ranked AS (
    SELECT
      t.*,
      d.full_name, d.code,
      tm.team_name, tm.team_colour,
      se.status,
      RANK() OVER (
        ORDER BY CASE WHEN se.status = 'DNF' THEN 1 ELSE 0 END, t.cumulative
      ) AS live_rank,
      MIN(CASE WHEN se.status <> 'DNF' THEN t.cumulative END) OVER () AS leader_cum
    FROM totals t
    JOIN session_entry se ON se.session_key = p_session_key AND se.driver_number = t.driver_number
    JOIN driver d ON d.driver_number = t.driver_number
    JOIN session s ON s.session_key = p_session_key
    JOIN meeting m ON m.meeting_key = s.meeting_key
    JOIN driver_season ds ON ds.year = m.year AND ds.driver_number = t.driver_number
    JOIN team tm ON tm.team_id = ds.team_id
  )
  SELECT
    live_rank,
    driver_number,
    full_name,
    team_name,
    team_colour,
    CASE WHEN live_rank = 1 OR status = 'DNF' THEN NULL ELSE ROUND(cumulative - leader_cum, 3) END AS gap_to_leader,
    NULL AS gap_to_car_ahead,
    compound,
    last_lap,
    CASE status WHEN 'RUNNING' THEN NULL ELSE status END AS status,
    code
  FROM ranked
  ORDER BY live_rank;
END$$

CREATE PROCEDURE Get_Driver_Lap_History(IN p_session_key INT, IN p_driver_number INT)
BEGIN
  SELECT
    l.lap_number,
    l.lap_duration,
    l.duration_sector_1,
    l.duration_sector_2,
    l.duration_sector_3,
    (b1.lap_number = l.lap_number AND b1.driver_number = l.driver_number) AS is_purple_s1,
    (b2.lap_number = l.lap_number AND b2.driver_number = l.driver_number) AS is_purple_s2,
    (b3.lap_number = l.lap_number AND b3.driver_number = l.driver_number) AS is_purple_s3,
    l.compound,
    l.is_pit_out_lap,
    l.lap_duration = (
      SELECT MIN(x.lap_duration) FROM laps x
      WHERE x.session_key = l.session_key
        AND x.driver_number = l.driver_number
        AND x.is_pit_out_lap = 0
    ) AS is_personal_best
  FROM laps l
  LEFT JOIN session_best b1 ON b1.session_key = l.session_key AND b1.kind = 'S1'
  LEFT JOIN session_best b2 ON b2.session_key = l.session_key AND b2.kind = 'S2'
  LEFT JOIN session_best b3 ON b3.session_key = l.session_key AND b3.kind = 'S3'
  WHERE l.session_key = p_session_key AND l.driver_number = p_driver_number
  ORDER BY l.lap_number;
END$$

CREATE PROCEDURE Get_Session_Weather(IN p_session_key INT)
BEGIN
  SELECT air_temperature, track_temperature, humidity, rainfall, wind_speed, ts AS date
  FROM weather
  WHERE session_key = p_session_key
  ORDER BY ts DESC
  LIMIT 1;
END$$

CREATE PROCEDURE Get_Race_Control_Feed(IN p_session_key INT, IN p_since DATETIME(3))
BEGIN
  SELECT ts AS date, category, flag, scope, driver_number, message
  FROM race_control
  WHERE session_key = p_session_key AND ts > p_since
  ORDER BY ts;
END$$

CREATE PROCEDURE Get_Pit_Stops(IN p_session_key INT)
BEGIN
  SELECT p.driver_number, d.full_name, p.lap_number, p.stop_duration, p.lane_duration
  FROM pit_stop p
  JOIN driver d ON d.driver_number = p.driver_number
  WHERE p.session_key = p_session_key
  ORDER BY p.lap_number, p.stop_duration;
END$$

CREATE PROCEDURE Get_Session_Info(IN p_session_key INT)
BEGIN
  SELECT m.meeting_name, s.session_name, c.short_name AS circuit_short_name,
         c.country_name, s.date_start, s.date_end
  FROM session s
  JOIN meeting m ON m.meeting_key = s.meeting_key
  JOIN circuit c ON c.circuit_id = m.circuit_id
  WHERE s.session_key = p_session_key;
END$$

CREATE PROCEDURE Get_Driver_List(IN p_session_key INT)
BEGIN
  SELECT d.driver_number, d.full_name, t.team_name, t.team_colour, d.headshot_url, d.code
  FROM session_entry se
  JOIN session s ON s.session_key = se.session_key
  JOIN meeting m ON m.meeting_key = s.meeting_key
  JOIN driver d ON d.driver_number = se.driver_number
  JOIN driver_season ds ON ds.year = m.year AND ds.driver_number = d.driver_number
  JOIN team t ON t.team_id = ds.team_id
  WHERE se.session_key = p_session_key
  ORDER BY d.driver_number;
END$$

CREATE PROCEDURE Get_Seasons()
BEGIN
  SELECT year, name, status,
         (SELECT COUNT(*) FROM meeting m WHERE m.year = season.year) AS meeting_count
  FROM season
  ORDER BY year DESC;
END$$

CREATE PROCEDURE Get_Season_Meetings(IN p_year SMALLINT)
BEGIN
  SELECT m.year, m.round, m.meeting_key, s.session_key, m.meeting_name,
         c.short_name AS circuit_short_name, c.country_name, m.date_start, m.status,
         d.full_name AS winner_name, rr.driver_number AS winner_number, t.team_name AS winner_team
  FROM meeting m
  JOIN circuit c ON c.circuit_id = m.circuit_id
  LEFT JOIN session s ON s.meeting_key = m.meeting_key AND s.session_name = 'Race'
  LEFT JOIN race_result rr ON rr.session_key = s.session_key AND rr.position = 1
  LEFT JOIN driver d ON d.driver_number = rr.driver_number
  LEFT JOIN driver_season ds ON ds.year = m.year AND ds.driver_number = rr.driver_number
  LEFT JOIN team t ON t.team_id = ds.team_id
  WHERE m.year = p_year
  ORDER BY m.round;
END$$

CREATE PROCEDURE Get_Race_Result(IN p_session_key INT)
BEGIN
  SELECT rr.position, rr.driver_number, d.full_name, t.team_name, t.team_colour,
         d.code, rr.gap_to_leader, rr.points, rr.status, rr.laps, rr.fastest_lap
  FROM race_result rr
  JOIN session s ON s.session_key = rr.session_key
  JOIN meeting m ON m.meeting_key = s.meeting_key
  JOIN driver d ON d.driver_number = rr.driver_number
  JOIN driver_season ds ON ds.year = m.year AND ds.driver_number = d.driver_number
  JOIN team t ON t.team_id = ds.team_id
  WHERE rr.session_key = p_session_key
  ORDER BY rr.position;
END$$

CREATE PROCEDURE Get_Driver_Standings(IN p_year SMALLINT)
BEGIN
  SELECT
    RANK() OVER (ORDER BY SUM(rr.points) DESC, SUM(rr.position = 1) DESC) AS position,
    d.driver_number, d.full_name, t.team_name, t.team_colour, d.code,
    SUM(rr.points) AS points,
    SUM(rr.position = 1 AND rr.status = 'Classified') AS wins,
    SUM(rr.position <= 3 AND rr.status = 'Classified') AS podiums
  FROM race_result rr
  JOIN session s ON s.session_key = rr.session_key
  JOIN meeting m ON m.meeting_key = s.meeting_key
  JOIN driver d ON d.driver_number = rr.driver_number
  JOIN driver_season ds ON ds.year = p_year AND ds.driver_number = d.driver_number
  JOIN team t ON t.team_id = ds.team_id
  WHERE m.year = p_year
  GROUP BY d.driver_number, d.full_name, t.team_name, t.team_colour, d.code
  ORDER BY points DESC, wins DESC;
END$$

CREATE PROCEDURE Get_Constructor_Standings(IN p_year SMALLINT)
BEGIN
  SELECT
    RANK() OVER (ORDER BY SUM(rr.points) DESC, SUM(rr.position = 1) DESC) AS position,
    t.team_name, t.team_colour,
    SUM(rr.points) AS points,
    SUM(rr.position = 1 AND rr.status = 'Classified') AS wins
  FROM race_result rr
  JOIN session s ON s.session_key = rr.session_key
  JOIN meeting m ON m.meeting_key = s.meeting_key
  JOIN driver_season ds ON ds.year = p_year AND ds.driver_number = rr.driver_number
  JOIN team t ON t.team_id = ds.team_id
  WHERE m.year = p_year
  GROUP BY t.team_id, t.team_name, t.team_colour
  ORDER BY points DESC, wins DESC;
END$$

DELIMITER ;
