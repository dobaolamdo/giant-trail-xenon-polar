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
  s1?: number | null;
  s2?: number | null;
  s3?: number | null;
  s1_state?: "active" | "done" | "pb" | "purple" | "pending";
  s2_state?: "active" | "done" | "pb" | "purple" | "pending";
  s3_state?: "active" | "done" | "pb" | "purple" | "pending";
  best_lap?: number | null;
  overtake_mode?: boolean;
  battery_soc?: number;
  deployment_kw?: number;
  is_clipping?: boolean;
  speed?: number;
  gear?: number | string;
  rpm?: number;
  throttle?: number;
  brake?: number;
  drs?: number;
  aero_mode?: "X-MODE" | "Z-MODE";
  lap_fraction?: number;
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
  retired?: boolean;
  pit_this_lap?: boolean;
  sc_this_lap?: boolean;
  sectors?: any;
};

export type SessionSnapshot = {
  time: number;
  completed_laps: number;
  cars: SessionSnapshotCar[];
};

export type DriverStandingRow = {
  position: number;
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  code: string;
  points: number;
  wins: number;
  podiums: number;
};

export type ConstructorStandingRow = {
  position: number;
  team_name: string;
  team_colour: string;
  points: number;
  wins: number;
};

export type MeetingRow = {
  round: number;
  year: number;
  session_key: number;
  meeting_name: string;
  circuit_short_name: string;
  country_name: string;
  date_start: string;
  status: "complete" | "upcoming" | "live";
  winner_name?: string;
};

export type RaceResultRow = {
  position: number;
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  gap_to_leader: number | null;
  status: "Classified" | "DNF";
  points: number;
  code?: string;
  laps?: number;
};

export type SeasonRow = {
  year: number;
  winner_name?: string;
};
