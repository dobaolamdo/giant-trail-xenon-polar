-- PITWALL · MySQL 8 schema
-- Frontend never SELECTs these tables. It only sees Get_* procedures.

CREATE DATABASE IF NOT EXISTS pitwall
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pitwall;

CREATE TABLE season (
  year         SMALLINT PRIMARY KEY,
  name         VARCHAR(80) NOT NULL,
  status       ENUM('complete','in_progress') NOT NULL
);

CREATE TABLE team (
  team_id      INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(64) NOT NULL,
  colour       CHAR(6) NOT NULL
);

CREATE TABLE driver (
  driver_number SMALLINT PRIMARY KEY,
  code          CHAR(3) NOT NULL,
  full_name     VARCHAR(64) NOT NULL
);

-- Roster changes by year (Hamilton Ferrari 2025, etc.)
CREATE TABLE driver_entry (
  year          SMALLINT NOT NULL,
  driver_number SMALLINT NOT NULL,
  team_id       INT NOT NULL,
  PRIMARY KEY (year, driver_number),
  FOREIGN KEY (year) REFERENCES season(year),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number),
  FOREIGN KEY (team_id) REFERENCES team(team_id)
);

CREATE TABLE circuit (
  circuit_id         INT AUTO_INCREMENT PRIMARY KEY,
  short_name         VARCHAR(48) NOT NULL,
  country_name       VARCHAR(48) NOT NULL
);

CREATE TABLE meeting (
  meeting_key        INT PRIMARY KEY,
  year               SMALLINT NOT NULL,
  round              TINYINT NOT NULL,
  circuit_id         INT NOT NULL,
  meeting_name       VARCHAR(80) NOT NULL,
  date_start         DATETIME NOT NULL,
  UNIQUE (year, round),
  FOREIGN KEY (year) REFERENCES season(year),
  FOREIGN KEY (circuit_id) REFERENCES circuit(circuit_id)
);

CREATE TABLE session (
  session_key        INT PRIMARY KEY,
  meeting_key        INT NOT NULL,
  session_name       VARCHAR(32) NOT NULL DEFAULT 'Race',
  date_start         DATETIME NOT NULL,
  date_end           DATETIME NULL,
  status             ENUM('upcoming','live','complete') NOT NULL DEFAULT 'upcoming',
  FOREIGN KEY (meeting_key) REFERENCES meeting(meeting_key)
);

-- RAW ingest. OpenF1 / data pump only writes these columns.
-- is_purple_* is 0 on insert; trigger fills them.
CREATE TABLE lap (
  session_key        INT NOT NULL,
  driver_number      SMALLINT NOT NULL,
  lap_number         SMALLINT NOT NULL,
  lap_duration       DECIMAL(8,3) NOT NULL,
  duration_sector_1  DECIMAL(8,3) NOT NULL,
  duration_sector_2  DECIMAL(8,3) NOT NULL,
  duration_sector_3  DECIMAL(8,3) NOT NULL,
  compound           ENUM('SOFT','MEDIUM','HARD','INTERMEDIATE','WET') NOT NULL,
  is_pit_out_lap     TINYINT(1) NOT NULL DEFAULT 0,
  is_purple_s1       TINYINT(1) NOT NULL DEFAULT 0,
  is_purple_s2       TINYINT(1) NOT NULL DEFAULT 0,
  is_purple_s3       TINYINT(1) NOT NULL DEFAULT 0,
  recorded_at        DATETIME(3) NOT NULL,
  PRIMARY KEY (session_key, driver_number, lap_number),
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number),
  INDEX idx_lap_session_time (session_key, recorded_at)
);

-- Side table so the trigger does not MIN() the same table it writes.
CREATE TABLE session_best (
  session_key  INT PRIMARY KEY,
  min_s1       DECIMAL(8,3) NULL,
  min_s2       DECIMAL(8,3) NULL,
  min_s3       DECIMAL(8,3) NULL,
  min_lap      DECIMAL(8,3) NULL,
  s1_driver    SMALLINT NULL,
  s2_driver    SMALLINT NULL,
  s3_driver    SMALLINT NULL,
  lap_driver   SMALLINT NULL,
  FOREIGN KEY (session_key) REFERENCES session(session_key)
);

-- Trace log: one row each time the trigger fires.
CREATE TABLE derived_event (
  event_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key    INT NOT NULL,
  recorded_at    DATETIME(3) NOT NULL,
  lap_number     SMALLINT NOT NULL,
  driver_number  SMALLINT NOT NULL,
  kind           ENUM('S1','S2','S3','LAP') NOT NULL,
  new_value      DECIMAL(8,3) NOT NULL,
  beaten_value   DECIMAL(8,3) NULL,
  beaten_driver  SMALLINT NULL,
  FOREIGN KEY (session_key) REFERENCES session(session_key)
);

CREATE TABLE weather (
  weather_id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key        INT NOT NULL,
  recorded_at        DATETIME(3) NOT NULL,
  air_temperature    DECIMAL(4,1) NOT NULL,
  track_temperature  DECIMAL(4,1) NOT NULL,
  humidity           DECIMAL(5,1) NOT NULL,
  rainfall           TINYINT(1) NOT NULL DEFAULT 0,
  wind_speed         DECIMAL(4,1) NOT NULL,
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  INDEX idx_weather_session (session_key, recorded_at)
);

CREATE TABLE race_control (
  message_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key    INT NOT NULL,
  recorded_at    DATETIME(3) NOT NULL,
  category       VARCHAR(32) NOT NULL,
  flag           VARCHAR(24) NOT NULL DEFAULT '',
  scope          VARCHAR(16) NOT NULL DEFAULT 'Track',
  driver_number  SMALLINT NULL,
  message        VARCHAR(255) NOT NULL,
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  INDEX idx_rc_session (session_key, recorded_at)
);

CREATE TABLE pit_stop (
  pit_id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_key    INT NOT NULL,
  driver_number  SMALLINT NOT NULL,
  lap_number     SMALLINT NOT NULL,
  stop_duration  DECIMAL(6,3) NOT NULL,
  lane_duration  DECIMAL(6,3) NOT NULL,
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number)
);

CREATE TABLE race_result (
  session_key    INT NOT NULL,
  position       TINYINT NOT NULL,
  driver_number  SMALLINT NOT NULL,
  gap_to_leader  DECIMAL(8,3) NULL,
  points         DECIMAL(5,1) NOT NULL DEFAULT 0,
  status         ENUM('Classified','DNF') NOT NULL,
  laps           SMALLINT NOT NULL,
  fastest_lap    TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (session_key, position),
  UNIQUE (session_key, driver_number),
  FOREIGN KEY (session_key) REFERENCES session(session_key),
  FOREIGN KEY (driver_number) REFERENCES driver(driver_number)
);

CREATE TABLE live_car (
  session_key    INT NOT NULL,
  driver_number  SMALLINT NOT NULL,
  cumulative     DECIMAL(10,3) NOT NULL DEFAULT 0,
  last_lap       DECIMAL(8,3) NULL,
  compound       VARCHAR(16) NULL,
  status         ENUM('RUN','PIT','OUT','DNF','SC') NOT NULL DEFAULT 'RUN',
  prev_rank      TINYINT NULL,
  PRIMARY KEY (session_key, driver_number),
  FOREIGN KEY (session_key) REFERENCES session(session_key)
);
