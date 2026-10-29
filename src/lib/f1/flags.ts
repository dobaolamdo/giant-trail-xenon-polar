/**
 * Country flag emojis and Grand Prix calendar metadata
 */

export function getCountryFlag(countryName?: string | null): string {
  if (!countryName) return "🏁";
  const name = countryName.toLowerCase();
  if (name.includes("bahrain")) return "🇧🇭";
  if (name.includes("saudi")) return "🇸🇦";
  if (name.includes("australia")) return "🇦🇺";
  if (name.includes("japan")) return "🇯🇵";
  if (name.includes("china")) return "🇨🇳";
  if (name.includes("miami") || name.includes("united states") || name.includes("las vegas") || name.includes("austin")) return "🇺🇸";
  if (name.includes("italy") || name.includes("imola") || name.includes("monza")) return "🇮🇹";
  if (name.includes("monaco")) return "🇲🇨";
  if (name.includes("spain") || name.includes("catalunya") || name.includes("barcelona")) return "🇪🇸";
  if (name.includes("canada") || name.includes("montreal")) return "🇨🇦";
  if (name.includes("austria") || name.includes("spielberg")) return "🇦🇹";
  if (name.includes("britain") || name.includes("united kingdom") || name.includes("silverstone")) return "🇬🇧";
  if (name.includes("belgium") || name.includes("spa")) return "🇧🇪";
  if (name.includes("hungary") || name.includes("hungaroring")) return "🇭🇺";
  if (name.includes("netherlands") || name.includes("zandvoort")) return "🇳🇱";
  if (name.includes("azerbaijan") || name.includes("baku")) return "🇦🇿";
  if (name.includes("singapore")) return "🇸🇬";
  if (name.includes("mexico")) return "🇲🇽";
  if (name.includes("brazil") || name.includes("interlagos")) return "🇧🇷";
  if (name.includes("qatar") || name.includes("lusail")) return "🇶🇦";
  if (name.includes("emirates") || name.includes("abu dhabi") || name.includes("yas marina")) return "🇦🇪";
  return "🏁";
}

export type F1RaceSchedule = {
  round: number;
  meeting_name: string;
  circuit_short_name: string;
  country_name: string;
  date_start: string; // ISO String UTC
  session_key?: number;
};

// Official 2026 FIA Formula One World Championship Calendar
export const CALENDAR_2026: F1RaceSchedule[] = [
  { round: 1, meeting_name: "Australian Grand Prix", circuit_short_name: "Melbourne", country_name: "Australia", date_start: "2026-03-15T05:00:00Z" },
  { round: 2, meeting_name: "Chinese Grand Prix", circuit_short_name: "Shanghai", country_name: "China", date_start: "2026-03-22T07:00:00Z" },
  { round: 3, meeting_name: "Japanese Grand Prix", circuit_short_name: "Suzuka", country_name: "Japan", date_start: "2026-04-05T05:00:00Z" },
  { round: 4, meeting_name: "Bahrain Grand Prix", circuit_short_name: "Sakhir", country_name: "Bahrain", date_start: "2026-04-12T15:00:00Z" },
  { round: 5, meeting_name: "Saudi Arabian Grand Prix", circuit_short_name: "Jeddah", country_name: "Saudi Arabia", date_start: "2026-04-19T17:00:00Z" },
  { round: 6, meeting_name: "Miami Grand Prix", circuit_short_name: "Miami", country_name: "United States", date_start: "2026-05-03T20:00:00Z" },
  { round: 7, meeting_name: "Emilia Romagna Grand Prix", circuit_short_name: "Imola", country_name: "Italy", date_start: "2026-05-17T13:00:00Z" },
  { round: 8, meeting_name: "Monaco Grand Prix", circuit_short_name: "Monaco", country_name: "Monaco", date_start: "2026-05-24T13:00:00Z" },
  { round: 9, meeting_name: "Spanish Grand Prix", circuit_short_name: "Barcelona", country_name: "Spain", date_start: "2026-05-31T13:00:00Z" },
  { round: 10, meeting_name: "Canadian Grand Prix", circuit_short_name: "Montreal", country_name: "Canada", date_start: "2026-06-14T18:00:00Z" },
  { round: 11, meeting_name: "Austrian Grand Prix", circuit_short_name: "Spielberg", country_name: "Austria", date_start: "2026-06-28T13:00:00Z" },
  { round: 12, meeting_name: "British Grand Prix", circuit_short_name: "Silverstone", country_name: "United Kingdom", date_start: "2026-07-05T14:00:00Z" },
  { round: 13, meeting_name: "Belgian Grand Prix", circuit_short_name: "Spa-Francorchamps", country_name: "Belgium", date_start: "2026-07-26T13:00:00Z" },
  { round: 14, meeting_name: "Hungarian Grand Prix", circuit_short_name: "Hungaroring", country_name: "Hungary", date_start: "2026-08-02T13:00:00Z" },
  { round: 15, meeting_name: "Dutch Grand Prix", circuit_short_name: "Zandvoort", country_name: "Netherlands", date_start: "2026-08-30T13:00:00Z" },
  { round: 16, meeting_name: "Italian Grand Prix", circuit_short_name: "Monza", country_name: "Italy", date_start: "2026-09-06T13:00:00Z" },
  { round: 17, meeting_name: "Azerbaijan Grand Prix", circuit_short_name: "Baku", country_name: "Azerbaijan", date_start: "2026-09-20T11:00:00Z", session_key: 11377 },
  { round: 18, meeting_name: "Singapore Grand Prix", circuit_short_name: "Marina Bay", country_name: "Singapore", date_start: "2026-10-04T12:00:00Z" },
  { round: 19, meeting_name: "United States Grand Prix", circuit_short_name: "Austin", country_name: "United States", date_start: "2026-10-18T19:00:00Z" },
  { round: 20, meeting_name: "Mexico City Grand Prix", circuit_short_name: "Mexico City", country_name: "Mexico", date_start: "2026-10-25T20:00:00Z" },
  { round: 21, meeting_name: "São Paulo Grand Prix", circuit_short_name: "Interlagos", country_name: "Brazil", date_start: "2026-11-08T17:00:00Z" },
  { round: 22, meeting_name: "Las Vegas Grand Prix", circuit_short_name: "Las Vegas", country_name: "United States", date_start: "2026-11-21T04:00:00Z" },
  { round: 23, meeting_name: "Qatar Grand Prix", circuit_short_name: "Lusail", country_name: "Qatar", date_start: "2026-11-29T16:00:00Z" },
  { round: 24, meeting_name: "Abu Dhabi Grand Prix", circuit_short_name: "Yas Marina", country_name: "United Arab Emirates", date_start: "2026-12-06T13:00:00Z" },
];

/**
 * Return the next upcoming Grand Prix relative to given time
 */
export function getNextGrandPrix(now: Date = new Date()): F1RaceSchedule {
  const future = CALENDAR_2026.find((r) => new Date(r.date_start).getTime() > now.getTime());
  return future || CALENDAR_2026[0];
}
