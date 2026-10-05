/** Shapes match the DB API contract (Get_* procedures). Extra UI fields are optional. */

export type LeaderboardRow = {
  live_rank: number;
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  gap_to_leader: number | null;
  gap_to_car_ahead: number | null;
  compound?: string;
  last_lap?: number | null;
  status?: "PIT" | "OUT" | "DNF" | "SC" | null;
  position_change?: number;
  code?: string;
  points?: number;
};

export type LapHistoryRow = {
  lap_number: number;
  lap_duration: number;
  duration_sector_1: number;
  duration_sector_2: number;
  duration_sector_3: number;
  is_purple_s1: boolean;
  is_purple_s2: boolean;
  is_purple_s3: boolean;
  compound: string;
  is_pit_out_lap: boolean;
  is_personal_best?: boolean;
};

export type WeatherRow = {
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  rainfall: boolean;
  wind_speed: number;
  date: string;
};

export type RaceControlRow = {
  date: string;
  category: string;
  flag: string;
  scope: string;
  driver_number: number | null;
  message: string;
};

export type PitStopRow = {
  driver_number: number;
  full_name: string;
  lap_number: number;
  stop_duration: number;
  lane_duration: number;
};

export type SessionInfo = {
  meeting_name: string;
  session_name: string;
  circuit_short_name: string;
  country_name: string;
  date_start: string;
  date_end: string;
};

export type DriverListRow = {
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  headshot_url?: string | null;
  code?: string;
  name_acronym?: string;
};

export type SessionSnapshotCar = {
  driver_number: number;
  cumulative: number;
  last_lap: number | null;
  status?: string | null;
  compound?: string;
};
