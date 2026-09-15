USE pitwall;
DELIMITER $$

-- BEFORE INSERT may only SET NEW.*  (same-table UPDATE is illegal in MySQL).
-- Compare against session_best, not against lap.

CREATE TRIGGER trg_lap_bi BEFORE INSERT ON lap
FOR EACH ROW
BEGIN
  DECLARE v_min_s1  DECIMAL(8,3);
  DECLARE v_min_s2  DECIMAL(8,3);
  DECLARE v_min_s3  DECIMAL(8,3);
  DECLARE v_min_lap DECIMAL(8,3);

  INSERT IGNORE INTO session_best (session_key) VALUES (NEW.session_key);

  SELECT min_s1, min_s2, min_s3, min_lap
    INTO v_min_s1, v_min_s2, v_min_s3, v_min_lap
    FROM session_best
   WHERE session_key = NEW.session_key;

  IF NEW.is_pit_out_lap = 0 THEN
    SET NEW.is_purple_s1 = (v_min_s1 IS NULL OR NEW.duration_sector_1 < v_min_s1);
    SET NEW.is_purple_s2 = (v_min_s2 IS NULL OR NEW.duration_sector_2 < v_min_s2);
    SET NEW.is_purple_s3 = (v_min_s3 IS NULL OR NEW.duration_sector_3 < v_min_s3);
  ELSE
    SET NEW.is_purple_s1 = 0, NEW.is_purple_s2 = 0, NEW.is_purple_s3 = 0;
  END IF;
END$$

-- AFTER INSERT writes OTHER tables only: session_best, derived_event, live_car.

CREATE TRIGGER trg_lap_ai AFTER INSERT ON lap
FOR EACH ROW
BEGIN
  DECLARE v_s1_drv  SMALLINT;
  DECLARE v_s2_drv  SMALLINT;
  DECLARE v_s3_drv  SMALLINT;
  DECLARE v_lap_drv SMALLINT;
  DECLARE v_min_s1  DECIMAL(8,3);
  DECLARE v_min_s2  DECIMAL(8,3);
  DECLARE v_min_s3  DECIMAL(8,3);
  DECLARE v_min_lap DECIMAL(8,3);

  INSERT IGNORE INTO session_best (session_key) VALUES (NEW.session_key);

  SELECT min_s1, min_s2, min_s3, min_lap, s1_driver, s2_driver, s3_driver, lap_driver
    INTO v_min_s1, v_min_s2, v_min_s3, v_min_lap, v_s1_drv, v_s2_drv, v_s3_drv, v_lap_drv
    FROM session_best
   WHERE session_key = NEW.session_key;

  IF NEW.is_purple_s1 THEN
    INSERT INTO derived_event
      (session_key, recorded_at, lap_number, driver_number, kind, new_value, beaten_value, beaten_driver)
    VALUES
      (NEW.session_key, NEW.recorded_at, NEW.lap_number, NEW.driver_number, 'S1',
       NEW.duration_sector_1, v_min_s1, v_s1_drv);
    UPDATE session_best
       SET min_s1 = NEW.duration_sector_1, s1_driver = NEW.driver_number
     WHERE session_key = NEW.session_key;
  END IF;

  IF NEW.is_purple_s2 THEN
    INSERT INTO derived_event
      (session_key, recorded_at, lap_number, driver_number, kind, new_value, beaten_value, beaten_driver)
    VALUES
      (NEW.session_key, NEW.recorded_at, NEW.lap_number, NEW.driver_number, 'S2',
       NEW.duration_sector_2, v_min_s2, v_s2_drv);
    UPDATE session_best
       SET min_s2 = NEW.duration_sector_2, s2_driver = NEW.driver_number
     WHERE session_key = NEW.session_key;
  END IF;

  IF NEW.is_purple_s3 THEN
    INSERT INTO derived_event
      (session_key, recorded_at, lap_number, driver_number, kind, new_value, beaten_value, beaten_driver)
    VALUES
      (NEW.session_key, NEW.recorded_at, NEW.lap_number, NEW.driver_number, 'S3',
       NEW.duration_sector_3, v_min_s3, v_s3_drv);
    UPDATE session_best
       SET min_s3 = NEW.duration_sector_3, s3_driver = NEW.driver_number
     WHERE session_key = NEW.session_key;
  END IF;

  IF NEW.is_pit_out_lap = 0 AND (v_min_lap IS NULL OR NEW.lap_duration < v_min_lap) THEN
    INSERT INTO derived_event
      (session_key, recorded_at, lap_number, driver_number, kind, new_value, beaten_value, beaten_driver)
    VALUES
      (NEW.session_key, NEW.recorded_at, NEW.lap_number, NEW.driver_number, 'LAP',
       NEW.lap_duration, v_min_lap, v_lap_drv);
    UPDATE session_best
       SET min_lap = NEW.lap_duration, lap_driver = NEW.driver_number
     WHERE session_key = NEW.session_key;
  END IF;

  INSERT INTO live_car (session_key, driver_number, cumulative, last_lap, compound, status)
  VALUES (NEW.session_key, NEW.driver_number, NEW.lap_duration, NEW.lap_duration, NEW.compound, 'RUN')
  ON DUPLICATE KEY UPDATE
    cumulative = cumulative + NEW.lap_duration,
    last_lap   = NEW.lap_duration,
    compound   = NEW.compound;
END$$

DELIMITER ;
