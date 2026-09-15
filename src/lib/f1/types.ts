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
  headshot_url: string;
  code: string;
};

export type SessionSnapshotCar = {
  driver_number: number;
  cumulative: number;
  last_lap: number | null;
  compound: string;
  pit_this_lap: boolean;
  retired: boolean;
  sc_this_lap: boolean;
  sectors: [number, number, number] | null;
};

export type SessionSnapshot = {
  completed_laps: number;
  time: number;
  cars: SessionSnapshotCar[];
};

export type SeasonRow = {
  year: number;
  name: string;
  status: "complete" | "in_progress";
  meeting_count: number;
};

export type MeetingRow = {
  year: number;
  round: number;
  meeting_key: number;
  session_key: number;
  meeting_name: string;
  circuit_short_name: string;
  country_name: string;
  date_start: string;
  status: "live" | "complete" | "upcoming";
  winner_name: string | null;
  winner_number: number | null;
  winner_team: string | null;
};

export type RaceResultRow = {
  position: number;
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  code: string;
  gap_to_leader: number | null;
  points: number;
  status: "Classified" | "DNF";
  laps: number;
  fastest_lap: boolean;
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
