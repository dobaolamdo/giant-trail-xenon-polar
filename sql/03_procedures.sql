USE pitwall;
DELIMITER $$

-- 1. Live tower. Window functions compute rank + gaps. Frontend column names.
CREATE PROCEDURE Get_Live_Leaderboard(IN p_session_key INT)
BEGIN
  SELECT
    RANK() OVER (
      ORDER BY CASE WHEN lc.status = 'DNF' THEN 1 ELSE 0 END,
               lc.cumulative
    ) AS live_rank,
    lc.driver_number,
    d.full_name,
    t.name AS team_name,
    t.colour AS team_colour,
    CASE
      WHEN lc.status = 'DNF' THEN NULL
      WHEN lc.cumulative = MIN(lc.cumulative) OVER (
             PARTITION BY CASE WHEN lc.status = 'DNF' THEN 1 ELSE 0 END
           ) THEN NULL
      ELSE lc.cumulative - MIN(lc.cumulative) OVER (
             PARTITION BY CASE WHEN lc.status = 'DNF' THEN 1 ELSE 0 END
           )
    END AS gap_to_leader,
    CASE
      WHEN lc.status = 'DNF' THEN NULL
      ELSE lc.cumulative - LAG(lc.cumulative) OVER (
             ORDER BY CASE WHEN lc.status = 'DNF' THEN 1 ELSE 0 END, lc.cumulative
           )
    END AS gap_to_car_ahead,
    lc.compound,
    lc.last_lap,
    NULLIF(lc.status, 'RUN') AS status,
    CAST(COALESCE(lc.prev_rank, 0) AS SIGNED)
      - CAST(RANK() OVER (
          ORDER BY CASE WHEN lc.status = 'DNF' THEN 1 ELSE 0 END, lc.cumulative
        ) AS SIGNED) AS position_change,
    d.code
  FROM live_car lc
  JOIN session s ON s.session_key = lc.session_key
  JOIN meeting m ON m.meeting_key = s.meeting_key
  JOIN driver d ON d.driver_number = lc.driver_number
  JOIN driver_entry e ON e.year = m.year AND e.driver_number = d.driver_number
  JOIN team t ON t.team_id = e.team_id
  WHERE lc.session_key = p_session_key
  ORDER BY live_rank;
END$$

-- 2. Driver lap list. is_personal_best via window MIN.
CREATE PROCEDURE Get_Driver_Lap_History(
  IN p_session_key INT,
  IN p_driver_number INT
)
BEGIN
  SELECT
    l.lap_number,
    l.lap_duration,
    l.duration_sector_1,
    l.duration_sector_2,
    l.duration_sector_3,
    (l.is_pit_out_lap = 0 AND l.duration_sector_1 = b.min_s1) AS is_purple_s1,
    (l.is_pit_out_lap = 0 AND l.duration_sector_2 = b.min_s2) AS is_purple_s2,
    (l.is_pit_out_lap = 0 AND l.duration_sector_3 = b.min_s3) AS is_purple_s3,
    l.compound,
    l.is_pit_out_lap,
    (l.is_pit_out_lap = 0 AND l.lap_duration = MIN(CASE WHEN l.is_pit_out_lap = 0 THEN l.lap_duration END) OVER ())
      AS is_personal_best
  FROM lap l
  JOIN session_best b ON b.session_key = l.session_key
  WHERE l.session_key = p_session_key
    AND l.driver_number = p_driver_number
  ORDER BY l.lap_number;
END$$

-- 3
CREATE PROCEDURE Get_Session_Weather(IN p_session_key INT)
BEGIN
  SELECT air_temperature, track_temperature, humidity, rainfall, wind_speed,
         recorded_at AS date
    FROM weather
   WHERE session_key = p_session_key
   ORDER BY recorded_at DESC
   LIMIT 1;
END$$

-- 4
CREATE PROCEDURE Get_Race_Control_Feed(
  IN p_session_key INT,
  IN p_since DATETIME(3)
)
BEGIN
  SELECT recorded_at AS date, category, flag, scope, driver_number, message
    FROM race_control
   WHERE session_key = p_session_key
     AND recorded_at > p_since
   ORDER BY recorded_at;
END$$

-- 5
CREATE PROCEDURE Get_Pit_Stops(IN p_session_key INT)
BEGIN
  SELECT p.driver_number, d.full_name, p.lap_number, p.stop_duration, p.lane_duration
    FROM pit_stop p
    JOIN driver d ON d.driver_number = p.driver_number
   WHERE p.session_key = p_session_key
   ORDER BY p.lap_number, p.stop_duration;
END$$

-- 6
CREATE PROCEDURE Get_Session_Info(IN p_session_key INT)
BEGIN
  SELECT m.meeting_name, s.session_name, c.short_name AS circuit_short_name,
         c.country_name, s.date_start, s.date_end
    FROM session s
    JOIN meeting m ON m.meeting_key = s.meeting_key
    JOIN circuit c ON c.circuit_id = m.circuit_id
   WHERE s.session_key = p_session_key;
END$$

-- 7
CREATE PROCEDURE Get_Driver_List(IN p_session_key INT)
BEGIN
  SELECT d.driver_number, d.full_name, t.name AS team_name, t.colour AS team_colour,
         '' AS headshot_url, d.code
    FROM session s
    JOIN meeting m ON m.meeting_key = s.meeting_key
    JOIN driver_entry e ON e.year = m.year
    JOIN driver d ON d.driver_number = e.driver_number
    JOIN team t ON t.team_id = e.team_id
   WHERE s.session_key = p_session_key
   ORDER BY d.driver_number;
END$$

-- 8–12 archive / championship (same names the UI already calls)

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
         c.short_name AS circuit_short_name, c.country_name, m.date_start,
         s.status,
         win.full_name AS winner_name,
         rr.driver_number AS winner_number,
         wt.name AS winner_team
    FROM meeting m
    JOIN circuit c ON c.circuit_id = m.circuit_id
    JOIN session s ON s.meeting_key = m.meeting_key AND s.session_name = 'Race'
    LEFT JOIN race_result rr ON rr.session_key = s.session_key AND rr.position = 1
    LEFT JOIN driver win ON win.driver_number = rr.driver_number
    LEFT JOIN driver_entry e ON e.year = m.year AND e.driver_number = rr.driver_number
    LEFT JOIN team wt ON wt.team_id = e.team_id
   WHERE m.year = p_year
   ORDER BY m.round;
END$$

CREATE PROCEDURE Get_Race_Result(IN p_session_key INT)
BEGIN
  SELECT rr.position, rr.driver_number, d.full_name, t.name AS team_name,
         t.colour AS team_colour, d.code, rr.gap_to_leader, rr.points,
         rr.status, rr.laps, rr.fastest_lap
    FROM race_result rr
    JOIN session s ON s.session_key = rr.session_key
    JOIN meeting m ON m.meeting_key = s.meeting_key
    JOIN driver d ON d.driver_number = rr.driver_number
    JOIN driver_entry e ON e.year = m.year AND e.driver_number = d.driver_number
    JOIN team t ON t.team_id = e.team_id
   WHERE rr.session_key = p_session_key
   ORDER BY rr.position;
END$$

CREATE PROCEDURE Get_Driver_Standings(IN p_year SMALLINT)
BEGIN
  SELECT
    RANK() OVER (ORDER BY SUM(rr.points) DESC, SUM(rr.position = 1) DESC) AS position,
    d.driver_number, d.full_name, t.name AS team_name, t.colour AS team_colour, d.code,
    SUM(rr.points) AS points,
    SUM(rr.position = 1 AND rr.status = 'Classified') AS wins,
    SUM(rr.position <= 3 AND rr.status = 'Classified') AS podiums
  FROM race_result rr
  JOIN session s ON s.session_key = rr.session_key
  JOIN meeting m ON m.meeting_key = s.meeting_key
  JOIN driver d ON d.driver_number = rr.driver_number
  JOIN driver_entry e ON e.year = p_year AND e.driver_number = d.driver_number
  JOIN team t ON t.team_id = e.team_id
  WHERE m.year = p_year
    AND s.status = 'complete'
  GROUP BY d.driver_number, d.full_name, t.name, t.colour, d.code
  ORDER BY points DESC, wins DESC;
END$$

CREATE PROCEDURE Get_Constructor_Standings(IN p_year SMALLINT)
BEGIN
  SELECT
    RANK() OVER (ORDER BY SUM(rr.points) DESC) AS position,
    t.name AS team_name,
    t.colour AS team_colour,
    SUM(rr.points) AS points,
    SUM(rr.position = 1 AND rr.status = 'Classified') AS wins
  FROM race_result rr
  JOIN session s ON s.session_key = rr.session_key
  JOIN meeting m ON m.meeting_key = s.meeting_key
  JOIN driver_entry e ON e.year = p_year AND e.driver_number = rr.driver_number
  JOIN team t ON t.team_id = e.team_id
  WHERE m.year = p_year
    AND s.status = 'complete'
  GROUP BY t.team_id, t.name, t.colour
  ORDER BY points DESC;
END$$

CREATE PROCEDURE Get_Derived_Events(IN p_session_key INT)
BEGIN
  SELECT e.event_id, e.recorded_at, e.lap_number, e.driver_number,
         d.code, d.full_name, t.colour AS team_colour,
         e.kind, e.new_value AS value, e.beaten_value AS beaten,
         bd.code AS beaten_code
    FROM derived_event e
    JOIN session s ON s.session_key = e.session_key
    JOIN meeting m ON m.meeting_key = s.meeting_key
    JOIN driver d ON d.driver_number = e.driver_number
    JOIN driver_entry en ON en.year = m.year AND en.driver_number = d.driver_number
    JOIN team t ON t.team_id = en.team_id
    LEFT JOIN driver bd ON bd.driver_number = e.beaten_driver
   WHERE e.session_key = p_session_key
   ORDER BY e.event_id;
END$$

DELIMITER ;
