import { i as __toESM } from "../_runtime.mjs";
import { c as require_react, n as Slot, s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { a as RotateCcw, c as Minus, d as Droplets, f as Cloud, i as Thermometer, l as Gauge, m as ChevronDown, n as Wind, o as Play, p as ChevronUp, s as Pause, t as X, u as Flag } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
import { a as ResponsiveContainer, i as Line, n as YAxis, r as XAxis, t as LineChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-S4NfC6VL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function teamHex(colour) {
	const c = colour.trim();
	if (!c) return "#8b8d94";
	return c.startsWith("#") ? c : `#${c}`;
}
function onTeam(colour) {
	const hex = teamHex(colour).slice(1);
	if (hex.length < 6) return "#f3f4f6";
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	return (.299 * r + .587 * g + .114 * b) / 255 > .62 ? "#070708" : "#f3f4f6";
}
var SESSION_KEY = 96001;
var BASE_LAP = 97.84;
var SC_LAPS = {
	from: 26,
	to: 29
};
var DRIVERS = [
	{
		driver_number: 1,
		code: "VER",
		full_name: "Max Verstappen",
		team_name: "Red Bull Racing",
		team_colour: "3671C6",
		grid: 1,
		pace: .9932,
		consistency: .11,
		pitLaps: [19],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 4,
		code: "NOR",
		full_name: "Lando Norris",
		team_name: "McLaren",
		team_colour: "FF8000",
		grid: 2,
		pace: .9918,
		consistency: .13,
		pitLaps: [17],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 81,
		code: "PIA",
		full_name: "Oscar Piastri",
		team_name: "McLaren",
		team_colour: "FF8000",
		grid: 3,
		pace: .9944,
		consistency: .14,
		pitLaps: [18],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 16,
		code: "LEC",
		full_name: "Charles Leclerc",
		team_name: "Ferrari",
		team_colour: "E8002D",
		grid: 4,
		pace: .9956,
		consistency: .16,
		pitLaps: [20],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 44,
		code: "HAM",
		full_name: "Lewis Hamilton",
		team_name: "Ferrari",
		team_colour: "E8002D",
		grid: 5,
		pace: .9968,
		consistency: .15,
		pitLaps: [21],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 63,
		code: "RUS",
		full_name: "George Russell",
		team_name: "Mercedes",
		team_colour: "27F4D2",
		grid: 6,
		pace: .9961,
		consistency: .14,
		pitLaps: [18],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 12,
		code: "ANT",
		full_name: "Kimi Antonelli",
		team_name: "Mercedes",
		team_colour: "27F4D2",
		grid: 7,
		pace: .9974,
		consistency: .2,
		pitLaps: [14, 38],
		compounds: [
			"SOFT",
			"HARD",
			"SOFT"
		]
	},
	{
		driver_number: 55,
		code: "SAI",
		full_name: "Carlos Sainz",
		team_name: "Williams",
		team_colour: "64C4FF",
		grid: 8,
		pace: .9988,
		consistency: .17,
		pitLaps: [22],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 23,
		code: "ALB",
		full_name: "Alexander Albon",
		team_name: "Williams",
		team_colour: "64C4FF",
		grid: 9,
		pace: .9996,
		consistency: .18,
		pitLaps: [23],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 14,
		code: "ALO",
		full_name: "Fernando Alonso",
		team_name: "Aston Martin",
		team_colour: "229971",
		grid: 10,
		pace: 1.0008,
		consistency: .16,
		pitLaps: [19],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 22,
		code: "TSU",
		full_name: "Yuki Tsunoda",
		team_name: "Red Bull Racing",
		team_colour: "3671C6",
		grid: 11,
		pace: 1.0014,
		consistency: .19,
		pitLaps: [16, 41],
		compounds: [
			"SOFT",
			"HARD",
			"SOFT"
		]
	},
	{
		driver_number: 6,
		code: "HAD",
		full_name: "Isack Hadjar",
		team_name: "Racing Bulls",
		team_colour: "6692FF",
		grid: 12,
		pace: 1.0022,
		consistency: .22,
		pitLaps: [13, 36],
		compounds: [
			"SOFT",
			"MEDIUM",
			"SOFT"
		]
	},
	{
		driver_number: 30,
		code: "LAW",
		full_name: "Liam Lawson",
		team_name: "Racing Bulls",
		team_colour: "6692FF",
		grid: 13,
		pace: 1.003,
		consistency: .2,
		pitLaps: [21],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 10,
		code: "GAS",
		full_name: "Pierre Gasly",
		team_name: "Alpine",
		team_colour: "0093C7",
		grid: 14,
		pace: 1.0036,
		consistency: .18,
		pitLaps: [16, 40],
		compounds: [
			"MEDIUM",
			"HARD",
			"SOFT"
		]
	},
	{
		driver_number: 43,
		code: "COL",
		full_name: "Franco Colapinto",
		team_name: "Alpine",
		team_colour: "0093C7",
		grid: 15,
		pace: 1.0048,
		consistency: .24,
		pitLaps: [15, 42],
		compounds: [
			"SOFT",
			"HARD",
			"MEDIUM"
		]
	},
	{
		driver_number: 31,
		code: "OCO",
		full_name: "Esteban Ocon",
		team_name: "Haas",
		team_colour: "B6BABD",
		grid: 16,
		pace: 1.0052,
		consistency: .19,
		pitLaps: [24],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 87,
		code: "BEA",
		full_name: "Oliver Bearman",
		team_name: "Haas",
		team_colour: "B6BABD",
		grid: 17,
		pace: 1.006,
		consistency: .23,
		pitLaps: [14, 39],
		compounds: [
			"SOFT",
			"HARD",
			"SOFT"
		]
	},
	{
		driver_number: 27,
		code: "HUL",
		full_name: "Nico Hulkenberg",
		team_name: "Kick Sauber",
		team_colour: "52E252",
		grid: 18,
		pace: 1.0066,
		consistency: .17,
		pitLaps: [20],
		compounds: ["MEDIUM", "HARD"]
	},
	{
		driver_number: 5,
		code: "BOR",
		full_name: "Gabriel Bortoleto",
		team_name: "Kick Sauber",
		team_colour: "52E252",
		grid: 19,
		pace: 1.0078,
		consistency: .25,
		pitLaps: [15, 43],
		compounds: [
			"SOFT",
			"HARD",
			"MEDIUM"
		]
	},
	{
		driver_number: 18,
		code: "STR",
		full_name: "Lance Stroll",
		team_name: "Aston Martin",
		team_colour: "229971",
		grid: 20,
		pace: 1.0084,
		consistency: .21,
		pitLaps: [22],
		compounds: ["MEDIUM", "HARD"],
		dnfLap: 25
	}
];
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function round3(n) {
	return Math.round(n * 1e3) / 1e3;
}
function degFor(compound) {
	switch (compound) {
		case "SOFT": return .00155;
		case "HARD": return 72e-5;
		default: return .00105;
	}
}
function simulateRace() {
	const rng = mulberry32(20261004);
	const cars = DRIVERS.map((d) => ({
		...d,
		cumulative: 0,
		tyreAge: 0,
		stint: 0,
		retired: false,
		laps: []
	}));
	const snapshots = [];
	snapshots.push({
		completed_laps: 0,
		time: 0,
		cars: DRIVERS.map((d) => ({
			driver_number: d.driver_number,
			cumulative: d.grid * 1e-4,
			last_lap: null,
			compound: d.compounds[0] ?? "MEDIUM",
			pit_this_lap: false,
			retired: false,
			sc_this_lap: false,
			sectors: null
		}))
	});
	for (let lap = 1; lap <= 62; lap++) {
		const sc = lap >= SC_LAPS.from && lap <= SC_LAPS.to;
		const running = cars.filter((c) => !c.retired);
		running.sort((a, b) => a.cumulative - b.cumulative);
		const leadCum = running[0]?.cumulative ?? 0;
		for (const car of cars) {
			if (car.retired) continue;
			if (car.dnfLap === lap) {
				car.retired = true;
				continue;
			}
			const compound = car.compounds[car.stint] ?? "HARD";
			const isPit = car.pitLaps.includes(lap);
			const pitOut = car.pitLaps.includes(lap - 1);
			let duration;
			if (sc) {
				const target = leadCum + Math.max(0, running.findIndex((c) => c.driver_number === car.driver_number)) * .78;
				const remainingSc = SC_LAPS.to - lap + 1;
				const compress = (car.cumulative - target) / remainingSc;
				duration = 147.85 + rng() * .35 - compress;
				duration = Math.max(146.4, duration);
			} else {
				const fuel = 1 - lap * 16e-5;
				const deg = 1 + car.tyreAge * degFor(compound);
				const noise = 1 + (rng() * 2 - 1) * car.consistency * .0075;
				const startTax = lap === 1 ? 1.9 + car.grid * .12 : 0;
				duration = BASE_LAP * car.pace * fuel * deg * noise + startTax;
				if (isPit) duration += 22.8 + rng() * 2.4;
				if (pitOut) duration += .55;
			}
			duration = round3(duration);
			const s1f = .276 + (rng() - .5) * .008;
			const s2f = .351 + (rng() - .5) * .008;
			let s1 = round3(duration * s1f);
			let s2 = round3(duration * s2f);
			let s3 = round3(duration - s1 - s2);
			if (s3 < 8) {
				s3 = round3(duration * .37);
				s2 = round3(duration - s1 - s3);
			}
			car.laps.push({
				lap_number: lap,
				lap_duration: duration,
				duration_sector_1: s1,
				duration_sector_2: s2,
				duration_sector_3: s3,
				is_purple_s1: false,
				is_purple_s2: false,
				is_purple_s3: false,
				compound,
				is_pit_out_lap: pitOut
			});
			car.cumulative = round3(car.cumulative + duration);
			if (isPit) {
				car.stint += 1;
				car.tyreAge = 0;
			} else car.tyreAge += 1;
		}
		const lead = cars.filter((c) => !c.retired).reduce((min, c) => c.cumulative < min ? c.cumulative : min, Infinity);
		snapshots.push({
			completed_laps: lap,
			time: round3(lead),
			cars: cars.map((c) => {
				const last = c.laps[c.laps.length - 1];
				const retiredAlready = c.retired;
				return {
					driver_number: c.driver_number,
					cumulative: c.cumulative,
					last_lap: last && last.lap_number === lap ? last.lap_duration : last?.lap_duration ?? null,
					compound: last?.compound ?? c.compounds[0] ?? "MEDIUM",
					pit_this_lap: Boolean(last && last.lap_number === lap && c.pitLaps.includes(lap)),
					retired: retiredAlready,
					sc_this_lap: sc && !retiredAlready,
					sectors: last && last.lap_number === lap ? [
						last.duration_sector_1,
						last.duration_sector_2,
						last.duration_sector_3
					] : null
				};
			})
		});
	}
	const dateStart = "2026-10-04T12:00:00.000Z";
	const startMs = Date.parse(dateStart);
	const duration = snapshots[snapshots.length - 1]?.time ?? 0;
	const dateEnd = new Date(startMs + Math.ceil(duration) * 1e3).toISOString();
	const atLapTime = (lap, extra = 0) => {
		const snap = snapshots[Math.min(lap, snapshots.length - 1)];
		return new Date(startMs + Math.round(((snap?.time ?? 0) + extra) * 1e3)).toISOString();
	};
	const raceControl = [
		{
			date: new Date(startMs).toISOString(),
			category: "Flag",
			flag: "GREEN",
			scope: "Track",
			driver_number: null,
			message: "GREEN FLAG — RACE START"
		},
		{
			date: atLapTime(8, 12),
			category: "Flag",
			flag: "BLUE",
			scope: "Driver",
			driver_number: 5,
			message: "BLUE FLAG FOR BORTOLETO — LAPPED CAR"
		},
		{
			date: atLapTime(14, 20),
			category: "Other",
			flag: "BLACK AND WHITE",
			scope: "Driver",
			driver_number: 18,
			message: "BLACK AND WHITE FLAG — STROLL, TRACK LIMITS T7"
		},
		{
			date: atLapTime(25, 4),
			category: "Flag",
			flag: "YELLOW",
			scope: "Sector",
			driver_number: 18,
			message: "YELLOW FLAG — INCIDENT TURN 10, CAR 18 STOPPED"
		},
		{
			date: atLapTime(25, 9),
			category: "SafetyCar",
			flag: "SAFETY CAR",
			scope: "Track",
			driver_number: null,
			message: "SAFETY CAR DEPLOYED"
		},
		{
			date: atLapTime(25, 11),
			category: "Other",
			flag: "",
			scope: "Driver",
			driver_number: 18,
			message: "STROLL — RETIRED, REAR-LEFT DAMAGE"
		},
		{
			date: atLapTime(29, 40),
			category: "SafetyCar",
			flag: "SAFETY CAR",
			scope: "Track",
			driver_number: null,
			message: "SAFETY CAR IN THIS LAP"
		},
		{
			date: atLapTime(30, 2),
			category: "Flag",
			flag: "GREEN",
			scope: "Track",
			driver_number: null,
			message: "TRACK CLEAR — GREEN FLAG, RACING RESUMES"
		},
		{
			date: atLapTime(41, 18),
			category: "Drs",
			flag: "",
			scope: "Track",
			driver_number: null,
			message: "DRS ENABLED"
		},
		{
			date: atLapTime(48, 22),
			category: "Other",
			flag: "BLACK AND WHITE",
			scope: "Driver",
			driver_number: 30,
			message: "BLACK AND WHITE FLAG — LAWSON, FORCING OFF TRACK"
		},
		{
			date: atLapTime(55, 8),
			category: "Other",
			flag: "",
			scope: "Driver",
			driver_number: 81,
			message: "PIASTRI SETS FASTEST LAP"
		},
		{
			date: atLapTime(62, 1),
			category: "Flag",
			flag: "CHEQUERED",
			scope: "Track",
			driver_number: null,
			message: "CHEQUERED FLAG — NORRIS WINS IN SINGAPORE"
		}
	];
	const pitStops = [];
	for (const car of cars) for (const pitLap of car.pitLaps) {
		if (car.dnfLap && pitLap >= car.dnfLap) continue;
		const stop = round3(2.15 + mulberry32(car.driver_number * 97 + pitLap)() * 1.7);
		const lane = round3(22.4 + mulberry32(car.driver_number * 13 + pitLap)() * 3.8);
		pitStops.push({
			driver_number: car.driver_number,
			full_name: car.full_name,
			lap_number: pitLap,
			stop_duration: stop,
			lane_duration: lane
		});
	}
	pitStops.sort((a, b) => a.lap_number - b.lap_number || a.stop_duration - b.stop_duration);
	const session = {
		meeting_name: "Singapore Grand Prix",
		session_name: "Race",
		circuit_short_name: "Marina Bay",
		country_name: "Singapore",
		date_start: dateStart,
		date_end: dateEnd
	};
	const driverList = DRIVERS.map((d) => ({
		driver_number: d.driver_number,
		full_name: d.full_name,
		team_name: d.team_name,
		team_colour: d.team_colour,
		headshot_url: "",
		code: d.code
	}));
	const lapsByDriver = /* @__PURE__ */ new Map();
	for (const car of cars) lapsByDriver.set(car.driver_number, car.laps);
	return {
		session,
		driverList,
		snapshots,
		duration,
		startMs,
		raceControl,
		pitStops,
		lapsByDriver,
		driverByNumber: new Map(DRIVERS.map((d) => [d.driver_number, d])),
		totalLaps: 62
	};
}
var RACE = simulateRace();
function raceIso(elapsed) {
	return new Date(RACE.startMs + Math.max(0, elapsed) * 1e3).toISOString();
}
function lerp(a, b, f) {
	return a + (b - a) * f;
}
function snapshotWindow(elapsed) {
	const snaps = RACE.snapshots;
	const t = Math.max(0, elapsed);
	if (t <= 0) return {
		a: snaps[0],
		b: snaps[0],
		f: 0
	};
	let i = 0;
	while (i < snaps.length - 1 && snaps[i + 1].time <= t) i += 1;
	const a = snaps[i];
	const b = snaps[Math.min(i + 1, snaps.length - 1)];
	if (a === b || b.time <= a.time) return {
		a,
		b: a,
		f: 0
	};
	return {
		a,
		b,
		f: Math.min(1, Math.max(0, (t - a.time) / (b.time - a.time)))
	};
}
function boardFromCars(cars, prevRank) {
	const ordered = [...cars].sort((x, y) => {
		if (x.retired !== y.retired) return x.retired ? 1 : -1;
		return x.cumulative - y.cumulative;
	});
	const leader = ordered.find((c) => !c.retired);
	return ordered.map((car, idx) => {
		const def = RACE.driverByNumber.get(car.driver_number);
		const ahead = idx === 0 ? null : ordered[idx - 1];
		let status = null;
		if (car.retired) status = "DNF";
		else if (car.pit_this_lap) status = "PIT";
		else if (car.sc_this_lap) status = "SC";
		const prev = prevRank?.get(car.driver_number);
		return {
			live_rank: idx + 1,
			driver_number: car.driver_number,
			full_name: def?.full_name ?? `#${car.driver_number}`,
			team_name: def?.team_name ?? "",
			team_colour: def?.team_colour ?? "888888",
			gap_to_leader: car.retired || !leader || car === leader ? null : Math.max(0, car.cumulative - leader.cumulative),
			gap_to_car_ahead: car.retired || !ahead || idx === 0 ? null : Math.max(0, car.cumulative - ahead.cumulative),
			compound: car.compound,
			last_lap: car.last_lap,
			status,
			position_change: prev == null ? 0 : prev - (idx + 1),
			code: def?.code
		};
	});
}
/** 1. Get_Live_Leaderboard(session_key) */
function Get_Live_Leaderboard(session_key, elapsed = 0) {
	if (session_key !== 96001) return [];
	const { a, b, f } = snapshotWindow(elapsed);
	const byA = new Map(a.cars.map((c) => [c.driver_number, c]));
	const rows = boardFromCars(b.cars.map((carB) => {
		const carA = byA.get(carB.driver_number) ?? carB;
		const pit = f > .18 && f < .82 ? carB.pit_this_lap : Boolean(carA.pit_this_lap && f < .5);
		return {
			...carB,
			cumulative: lerp(carA.cumulative, carB.cumulative, f),
			pit_this_lap: pit,
			sc_this_lap: carA.sc_this_lap || carB.sc_this_lap,
			retired: carA.retired || carB.retired,
			last_lap: f < .08 ? carA.last_lap : carB.last_lap,
			compound: f < .5 ? carA.compound : carB.compound
		};
	}), new Map(a.cars.slice().sort((x, y) => Number(x.retired) - Number(y.retired) || x.cumulative - y.cumulative).map((c, i) => [c.driver_number, i + 1])));
	if (a.completed_laps === 0 && f < .02) return rows.map((r) => ({
		...r,
		gap_to_leader: r.live_rank === 1 ? null : null,
		gap_to_car_ahead: null,
		last_lap: null,
		position_change: 0
	}));
	return rows;
}
function sessionBests(upToLap) {
	let minS1 = Infinity;
	let minS2 = Infinity;
	let minS3 = Infinity;
	let minLap = Infinity;
	for (const laps of RACE.lapsByDriver.values()) for (const l of laps) {
		if (l.lap_number > upToLap || l.is_pit_out_lap) continue;
		minS1 = Math.min(minS1, l.duration_sector_1);
		minS2 = Math.min(minS2, l.duration_sector_2);
		minS3 = Math.min(minS3, l.duration_sector_3);
		minLap = Math.min(minLap, l.lap_duration);
	}
	return {
		minS1,
		minS2,
		minS3,
		minLap
	};
}
function completedLapsForDriver(driver_number, elapsed) {
	const { a } = snapshotWindow(elapsed);
	if (a.cars.find((c) => c.driver_number === driver_number)?.retired) return RACE.lapsByDriver.get(driver_number)?.length ?? 0;
	return a.completed_laps;
}
/** 2. Get_Driver_Lap_History(session_key, driver_number) */
function Get_Driver_Lap_History(session_key, driver_number, elapsed = 0) {
	if (session_key !== 96001) return [];
	const all = RACE.lapsByDriver.get(driver_number) ?? [];
	const n = completedLapsForDriver(driver_number, elapsed);
	const visible = all.filter((l) => l.lap_number <= n);
	const bests = sessionBests(n);
	const eps = 5e-4;
	let pb = Infinity;
	for (const l of visible) if (!l.is_pit_out_lap) pb = Math.min(pb, l.lap_duration);
	return visible.map((l) => ({
		...l,
		is_purple_s1: !l.is_pit_out_lap && l.duration_sector_1 <= bests.minS1 + eps,
		is_purple_s2: !l.is_pit_out_lap && l.duration_sector_2 <= bests.minS2 + eps,
		is_purple_s3: !l.is_pit_out_lap && l.duration_sector_3 <= bests.minS3 + eps,
		is_personal_best: !l.is_pit_out_lap && l.lap_duration <= pb + eps
	}));
}
/** 3. Get_Session_Weather(session_key) */
function Get_Session_Weather(session_key, elapsed = 0) {
	const t = Math.max(0, Math.min(1, elapsed / Math.max(1, RACE.duration)));
	const wave = Math.sin(elapsed / 80);
	return {
		air_temperature: Math.round((29.6 - t * 1.3 + wave * .15) * 10) / 10,
		track_temperature: Math.round((34.2 - t * 2.1 + wave * .25) * 10) / 10,
		humidity: Math.round((77.4 + t * 2.1 + wave * 1.2) * 10) / 10,
		rainfall: false,
		wind_speed: Math.round((7.4 + wave * 1.6) * 10) / 10,
		date: raceIso(elapsed)
	};
}
function Get_Race_Control_Until(session_key, elapsed = 0) {
	if (session_key !== 96001) return [];
	const now = raceIso(elapsed);
	return RACE.raceControl.filter((m) => m.date <= now);
}
/** 5. Get_Pit_Stops(session_key) */
function Get_Pit_Stops(session_key, elapsed = 0) {
	if (session_key !== 96001) return [];
	const { a } = snapshotWindow(elapsed);
	return RACE.pitStops.filter((p) => p.lap_number <= a.completed_laps + 1);
}
/** 6. Get_Session_Info(session_key) */
function Get_Session_Info(session_key) {
	if (session_key !== 96001) return null;
	return RACE.session;
}
/** 7. Get_Driver_List(session_key) */
function Get_Driver_List(session_key) {
	if (session_key !== 96001) return [];
	return RACE.driverList;
}
function currentLapNumber(elapsed) {
	const { a } = snapshotWindow(elapsed);
	if (a.completed_laps >= 62) return 62;
	return Math.min(62, Math.max(1, a.completed_laps + 1));
}
function isRaceFinished(elapsed) {
	return elapsed >= RACE.duration - .05;
}
function sessionProgress(elapsed) {
	return Math.min(1, Math.max(0, elapsed / Math.max(1, RACE.duration)));
}
var SPEEDS = [
	8,
	16,
	32,
	64
];
var startElapsed = RACE.snapshots[18]?.time ?? 0;
var SPEED_OPTIONS = SPEEDS;
var useRaceClock = create((set, get) => ({
	elapsed: startElapsed,
	playing: true,
	speed: 32,
	selectedDriver: 4,
	setElapsed: (t) => set({
		elapsed: Math.min(RACE.duration, Math.max(0, t)),
		playing: t < RACE.duration ? get().playing : false
	}),
	advance: (dtSec) => {
		const next = get().elapsed + dtSec;
		if (next >= RACE.duration) {
			set({
				elapsed: RACE.duration,
				playing: false
			});
			return;
		}
		set({ elapsed: next });
	},
	toggle: () => {
		const { playing, elapsed } = get();
		if (elapsed >= RACE.duration - .05) {
			set({
				elapsed: startElapsed,
				playing: true
			});
			return;
		}
		set({ playing: !playing });
	},
	setPlaying: (p) => set({ playing: p }),
	setSpeed: (s) => set({ speed: s }),
	cycleSpeed: () => {
		set({ speed: SPEEDS[(SPEEDS.indexOf(get().speed) + 1) % SPEEDS.length] });
	},
	selectDriver: (n) => set({ selectedDriver: n }),
	restart: () => set({
		elapsed: 0,
		playing: true
	})
}));
var buttonVariants = cva("inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-semibold tracking-wide uppercase transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-accent text-fg hover:bg-accent/90",
			secondary: "bg-surface-2 text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
			ghost: "text-muted hover:bg-surface-2 hover:text-fg",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-surface-2"
		},
		size: {
			default: "h-10 px-3.5",
			sm: "h-8 px-2.5 text-xs",
			lg: "h-11 px-4",
			icon: "size-10",
			"icon-sm": "size-8"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var Sheet = Dialog;
var SheetPortal = DialogPortal;
function SheetOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {
		className: cn("fixed inset-0 z-50 bg-bg/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
		...props
	});
}
function SheetContent({ className, children, side = "bottom", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
		className: cn("fixed z-50 flex flex-col bg-surface text-fg shadow-[var(--shadow-border)]", "data-[state=open]:animate-in data-[state=closed]:animate-out", "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom", side === "right" && "inset-y-0 right-0 h-full w-full max-w-md data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
			className: "absolute top-3 right-3 rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring/70",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Close"
			})]
		})]
	})] });
}
function SheetHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col gap-1 p-4 pr-12", className),
		...props
	});
}
function SheetTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
		className: cn("text-lg font-semibold tracking-wide uppercase", className),
		...props
	});
}
function SheetDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
		className: cn("text-sm text-muted", className),
		...props
	});
}
function splitName(full) {
	const parts = full.trim().split(/\s+/);
	if (parts.length === 1) return {
		first: "",
		last: parts[0] ?? full
	};
	return {
		first: parts.slice(0, -1).join(" "),
		last: parts[parts.length - 1] ?? full
	};
}
function formatLapTime(seconds) {
	if (seconds == null || Number.isNaN(seconds) || seconds <= 0) return "—";
	const m = Math.floor(seconds / 60);
	const [ints, frac] = (seconds - m * 60).toFixed(3).split(".");
	return `${m}:${(ints ?? "0").padStart(2, "0")}.${frac ?? "000"}`;
}
function formatGap(seconds) {
	if (seconds == null) return "—";
	if (seconds >= 1e3) return "+1 LAP";
	if (seconds < 0) seconds = 0;
	if (seconds >= 60) return `+${formatLapTime(seconds)}`;
	return `+${seconds.toFixed(3)}`;
}
function formatInterval(seconds) {
	if (seconds == null) return "—";
	if (seconds < 0) seconds = 0;
	if (seconds >= 60) return `+${formatLapTime(seconds)}`;
	return `+${seconds.toFixed(3)}`;
}
function formatSector(seconds) {
	if (seconds == null || seconds <= 0) return "—";
	return seconds.toFixed(3);
}
function formatClock(seconds) {
	const s = Math.max(0, Math.floor(seconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor(s % 3600 / 60);
	const r = s % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
	return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
var badgeVariants = cva("inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider", {
	variants: { variant: {
		default: "bg-accent text-fg",
		muted: "bg-surface-2 text-muted",
		outline: "shadow-[var(--shadow-border)] text-muted",
		live: "bg-accent/15 text-accent",
		green: "bg-flag-green/15 text-flag-green",
		yellow: "bg-flag-yellow/15 text-flag-yellow",
		purple: "bg-sector-purple/15 text-sector-purple"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
function TimingHeader() {
	const elapsed = useRaceClock((s) => s.elapsed);
	const playing = useRaceClock((s) => s.playing);
	const session = Get_Session_Info(SESSION_KEY);
	const weather = Get_Session_Weather(SESSION_KEY, elapsed);
	const lap = currentLapNumber(elapsed);
	const finished = isRaceFinished(elapsed);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex flex-col gap-3 px-3 pt-3 pb-2 sm:px-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block h-6 w-1 rounded-full bg-accent",
						"aria-hidden": true
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-extrabold tracking-[0.18em] text-fg sm:text-3xl",
						children: "PITWALL"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 truncate pl-3 text-sm tracking-wider text-muted uppercase",
					children: [
						session?.meeting_name,
						" · ",
						session?.circuit_short_name
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 flex-col items-end gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						variant: finished ? "muted" : "live",
						className: "gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full bg-current", playing && !finished && "live-dot") }), finished ? "Finish" : playing ? "Live" : "Paused"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-md bg-surface-2 px-2 py-1 font-mono text-xs tracking-wide text-fg tabular",
						children: session?.session_name
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs tracking-widest text-muted uppercase",
						children: "Lap"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-xl font-semibold tabular text-fg sm:text-2xl",
						children: [String(lap).padStart(2, "0"), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm text-muted",
							children: ["/", 62]
						})]
					})]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surface px-3 py-2 shadow-[var(--shadow-border)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeatherChip, {
					icon: Thermometer,
					label: "Air",
					value: `${weather.air_temperature.toFixed(1)}°`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeatherChip, {
					icon: Gauge,
					label: "Track",
					value: `${weather.track_temperature.toFixed(1)}°`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeatherChip, {
					icon: Droplets,
					label: "Hum",
					value: `${Math.round(weather.humidity)}%`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeatherChip, {
					icon: Wind,
					label: "Wind",
					value: `${weather.wind_speed.toFixed(1)}`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeatherChip, {
					icon: Cloud,
					label: "Sky",
					value: weather.rainfall ? "Rain" : "Dry"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ml-auto font-mono text-xs text-muted tabular",
					children: formatClock(elapsed)
				})
			]
		})]
	});
}
function WeatherChip({ icon: Icon, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1.5 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				className: "size-3.5 text-muted",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs tracking-wider text-muted uppercase",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-sm tabular text-fg",
				children: value
			})
		]
	});
}
function Slider({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
		className: cn("relative flex w-full touch-none items-center select-none", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
			className: "relative h-1 w-full grow overflow-hidden rounded-full bg-surface-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-accent" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "block size-3.5 rounded-full bg-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-ring/70" })]
	});
}
function PlaybackBar() {
	const elapsed = useRaceClock((s) => s.elapsed);
	const playing = useRaceClock((s) => s.playing);
	const speed = useRaceClock((s) => s.speed);
	const toggle = useRaceClock((s) => s.toggle);
	const setSpeed = useRaceClock((s) => s.setSpeed);
	const setElapsed = useRaceClock((s) => s.setElapsed);
	const restart = useRaceClock((s) => s.restart);
	const finished = isRaceFinished(elapsed);
	const progress = sessionProgress(elapsed);
	const showPause = playing && !finished;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-border bg-surface px-3 py-2.5 pr-28 sm:px-4 sm:pr-32",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: 0,
				max: RACE.duration,
				step: 1,
				value: [elapsed],
				onValueChange: (v) => setElapsed(v[0] ?? 0),
				"aria-label": "Race progress"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					size: "icon-sm",
					onClick: toggle,
					"aria-label": showPause ? "Pause" : "Play",
					children: showPause ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon-sm",
					onClick: restart,
					"aria-label": "Restart replay",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1",
					children: SPEED_OPTIONS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: speed === s ? "default" : "ghost",
						size: "sm",
						onClick: () => setSpeed(s),
						className: "min-w-10 px-2",
						children: [s, "x"]
					}, s))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "ml-auto font-mono text-xs text-muted tabular",
					children: [Math.round(progress * 100), "%"]
				})
			]
		})]
	});
}
var TYRE = {
	SOFT: {
		letter: "S",
		className: "border-tyre-soft text-tyre-soft",
		label: "Soft"
	},
	MEDIUM: {
		letter: "M",
		className: "border-tyre-medium text-tyre-medium",
		label: "Medium"
	},
	HARD: {
		letter: "H",
		className: "border-tyre-hard text-tyre-hard",
		label: "Hard"
	},
	INTERMEDIATE: {
		letter: "I",
		className: "border-flag-green text-flag-green",
		label: "Inter"
	},
	WET: {
		letter: "W",
		className: "border-muted text-muted",
		label: "Wet"
	}
};
function TyreCompound({ compound, size = "sm" }) {
	const t = TYRE[compound ?? ""] ?? {
		letter: "–",
		className: "border-border text-muted",
		label: "Unknown"
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		title: t.label,
		className: cn("inline-flex items-center justify-center rounded-full border-2 font-mono font-semibold leading-none", size === "sm" ? "tyre-letter size-5" : "size-7 text-xs", t.className),
		children: t.letter
	});
}
function Leaderboard({ rows, selected, onSelect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "panel flex min-h-0 flex-1 flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xs font-semibold tracking-widest text-muted uppercase",
					children: "Live leaderboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs tracking-wider text-subtle uppercase",
					children: "Tap a car"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "col-head hidden px-2 pb-1 tracking-widest text-subtle uppercase md:flex md:items-center md:gap-2",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-7 shrink-0 text-right",
						children: "P"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-4 shrink-0" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-9 shrink-0",
						children: "No"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "min-w-0 flex-1",
						children: "Driver"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-20 shrink-0 text-right",
						children: "Gap"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-16 shrink-0 text-right",
						children: "Int"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-20 shrink-0 text-right",
						children: "Last"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-6 shrink-0" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1",
				children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DriverRow, {
					row,
					selected: selected === row.driver_number,
					onSelect: () => onSelect(row.driver_number)
				}) }, row.driver_number))
			})
		]
	});
}
function DriverRow({ row, selected, onSelect }) {
	const { first, last } = splitName(row.full_name);
	const team = teamHex(row.team_colour);
	const pit = row.status === "PIT";
	const dnf = row.status === "DNF";
	const sc = row.status === "SC";
	let gapLabel;
	if (dnf) gapLabel = "DNF";
	else if (pit) gapLabel = "PIT";
	else if (row.live_rank === 1) gapLabel = "Leader";
	else if (sc) gapLabel = formatGap(row.gap_to_leader);
	else gapLabel = formatGap(row.gap_to_leader);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: onSelect,
		className: cn("flex min-h-11 w-full items-center gap-2 px-2 py-1.5 text-left transition-colors duration-150 md:min-h-10", "hover:bg-surface-2", selected ? "bg-surface-2" : "bg-transparent", dnf && "opacity-50"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("w-7 shrink-0 text-right font-mono text-sm font-semibold tabular", row.live_rank === 1 ? "text-accent" : "text-muted"),
				children: row.live_rank
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PosDelta, { delta: row.position_change ?? 0 }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-7 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-semibold tabular",
				style: {
					backgroundColor: team,
					color: onTeam(row.team_colour)
				},
				children: row.driver_number
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex min-w-0 items-baseline gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden truncate text-xs text-muted sm:inline",
						children: first
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate text-base font-bold tracking-wide text-fg uppercase",
						children: last
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden truncate text-xs text-subtle md:block",
					children: row.team_name
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("w-20 shrink-0 text-right font-mono text-sm tabular", dnf ? "text-muted" : pit ? "text-accent" : sc && row.live_rank !== 1 ? "text-flag-yellow" : "text-fg"),
				children: gapLabel
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden w-16 shrink-0 text-right font-mono text-xs tabular text-muted md:block",
				children: dnf || pit || row.live_rank === 1 ? "—" : formatInterval(row.gap_to_car_ahead)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden w-20 shrink-0 text-right font-mono text-xs tabular text-muted lg:block",
				children: formatLapTime(row.last_lap)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-6 shrink-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TyreCompound, { compound: row.compound })
			})
		]
	});
}
function PosDelta({ delta }) {
	if (delta > 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "flex w-4 shrink-0 justify-center text-sector-green",
		title: `Up ${delta}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-3.5" })
	});
	if (delta < 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "flex w-4 shrink-0 justify-center text-accent",
		title: `Down ${Math.abs(delta)}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "flex w-4 shrink-0 justify-center text-subtle",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-3" })
	});
}
function DriverDetail({ driver, row, laps }) {
	if (!driver || !row) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "p-4 text-sm text-muted",
		children: "Select a driver from the tower."
	});
	const { first, last } = splitName(driver.full_name);
	const lastLap = laps[laps.length - 1];
	const team = teamHex(driver.team_colour);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 border-l-4 px-3 py-3",
				style: { borderLeftColor: team },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-11 items-center justify-center rounded-md font-mono text-lg font-semibold tabular",
						style: {
							backgroundColor: team,
							color: onTeam(driver.team_colour)
						},
						children: driver.driver_number
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs tracking-wider text-muted uppercase",
								children: first
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "truncate text-xl font-extrabold tracking-wide text-fg uppercase",
								children: last
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-subtle",
								children: driver.team_name
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-right",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs tracking-widest text-muted uppercase",
							children: ["P", row.live_rank]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 flex items-center justify-end gap-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TyreCompound, {
								compound: row.compound,
								size: "md"
							})
						})]
					})
				]
			}),
			lastLap ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-4 gap-1 px-3 pb-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorBox, {
						label: "Lap",
						value: formatLapTime(lastLap.lap_duration),
						purple: lastLap.is_personal_best
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorBox, {
						label: "S1",
						value: formatSector(lastLap.duration_sector_1),
						purple: lastLap.is_purple_s1
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorBox, {
						label: "S2",
						value: formatSector(lastLap.duration_sector_2),
						purple: lastLap.is_purple_s2
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorBox, {
						label: "S3",
						value: formatSector(lastLap.duration_sector_3),
						purple: lastLap.is_purple_s3
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-3 pb-2 text-sm text-muted",
				children: "Waiting for first lap."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LapSpark, { laps }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "sticky top-0 bg-surface",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "text-xs tracking-widest text-subtle uppercase",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-1 font-medium",
									children: "Lap"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-1 py-1 font-medium",
									children: "Time"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-1 py-1 font-medium",
									children: "S1"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-1 py-1 font-medium",
									children: "S2"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-1 py-1 font-medium",
									children: "S3"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-2 py-1 font-medium" })
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: [...laps].reverse().map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-1 font-mono text-xs tabular text-muted",
								children: l.lap_number
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: cn("px-1 py-1 font-mono text-xs tabular", l.is_personal_best ? "text-sector-purple" : "text-fg"),
								children: formatLapTime(l.lap_duration)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorCell, {
								value: l.duration_sector_1,
								purple: l.is_purple_s1
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorCell, {
								value: l.duration_sector_2,
								purple: l.is_purple_s2
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorCell, {
								value: l.duration_sector_3,
								purple: l.is_purple_s3
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TyreCompound, { compound: l.compound })
							})
						]
					}, l.lap_number)) })]
				})
			})
		]
	});
}
function SectorBox({ label, value, purple }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-surface-2 px-2 py-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs tracking-widest text-subtle uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: cn("font-mono text-sm tabular", purple ? "text-sector-purple" : "text-fg"),
			children: value
		})]
	});
}
function SectorCell({ value, purple }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
		className: cn("px-1 py-1 font-mono text-xs tabular", purple ? "text-sector-purple" : "text-muted"),
		children: formatSector(value)
	});
}
function LapSpark({ laps }) {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setMounted(true), []);
	const points = laps.filter((l) => !l.is_pit_out_lap && l.lap_duration < 130).map((l) => ({
		lap: l.lap_number,
		t: l.lap_duration
	}));
	if (!mounted || points.length < 3) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-20 px-2 pb-1",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
				data: points,
				margin: {
					top: 6,
					right: 8,
					left: 8,
					bottom: 0
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						dataKey: "lap",
						hide: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						domain: ["dataMin - 0.5", "dataMax + 0.5"],
						hide: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						type: "monotone",
						dataKey: "t",
						stroke: "var(--color-accent)",
						strokeWidth: 1.6,
						dot: false,
						isAnimationActive: false
					})
				]
			})
		})
	});
}
function flagVariant(flag) {
	const f = flag.toUpperCase();
	if (f.includes("GREEN") || f.includes("CHEQUERED")) return "green";
	if (f.includes("YELLOW") || f.includes("SAFETY")) return "yellow";
	if (f.includes("RED") || f.includes("BLACK")) return "live";
	return "outline";
}
function RaceControlTicker() {
	const messages = Get_Race_Control_Until(SESSION_KEY, useRaceClock((s) => s.elapsed));
	const latest = messages[messages.length - 1];
	const seen = (0, import_react.useRef)("");
	(0, import_react.useEffect)(() => {
		if (!latest) return;
		if (seen.current === latest.date) return;
		const first = seen.current === "";
		seen.current = latest.date;
		if (first) return;
		if (/SAFETY CAR|RED FLAG|CHEQUERED|GREEN FLAG — RACE START/i.test(latest.message)) toast(latest.message, { description: latest.flag || latest.category });
	}, [latest]);
	if (!latest) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-3 pb-2 sm:px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 overflow-hidden rounded-lg bg-surface px-3 py-2 shadow-[var(--shadow-border)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, {
					className: "size-4 shrink-0 text-accent",
					"aria-hidden": true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: flagVariant(latest.flag),
					children: latest.flag || latest.category
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "min-w-0 truncate text-sm font-semibold tracking-wide text-fg uppercase",
					children: latest.message
				})
			]
		})
	});
}
function RaceControlList({ messages }) {
	const ordered = [...messages].reverse();
	if (ordered.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "px-3 py-4 text-sm text-muted",
		children: "Waiting for race control…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "flex flex-col",
		children: ordered.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex items-start gap-2 border-b border-border px-3 py-2 last:border-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("mt-1 size-1.5 shrink-0 rounded-full", flagVariant(m.flag) === "green" && "bg-flag-green", flagVariant(m.flag) === "yellow" && "bg-flag-yellow", flagVariant(m.flag) === "live" && "bg-accent", flagVariant(m.flag) === "outline" && "bg-muted") }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm leading-snug text-fg",
					children: m.message
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs tracking-wider text-subtle uppercase",
					children: [m.category, m.driver_number ? ` · Car ${m.driver_number}` : ""]
				})]
			})]
		}, m.date + m.message))
	});
}
function PitStopTable({ stops }) {
	if (stops.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "px-3 py-4 text-sm text-muted",
		children: "No pit stops yet."
	});
	const latest = [...stops].reverse();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
		className: "w-full text-left",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
			className: "text-xs tracking-widest text-subtle uppercase",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					className: "px-3 py-1.5 font-medium",
					children: "Driver"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					className: "px-2 py-1.5 font-medium",
					children: "Lap"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					className: "px-2 py-1.5 font-medium",
					children: "Stop"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					className: "px-3 py-1.5 font-medium",
					children: "Lane"
				})
			]
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: latest.map((s) => {
			const { last } = splitName(s.full_name);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-t border-border",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-1.5 text-sm font-semibold tracking-wide uppercase",
						children: last
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-2 py-1.5 font-mono text-sm tabular",
						children: s.lap_number
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "px-2 py-1.5 font-mono text-sm tabular",
						children: [s.stop_duration.toFixed(1), "s"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "px-3 py-1.5 font-mono text-sm tabular text-muted",
						children: [s.lane_duration.toFixed(1), "s"]
					})
				]
			}, `${s.driver_number}-${s.lap_number}`);
		}) })]
	});
}
function RaceTicker() {
	const playing = useRaceClock((s) => s.playing);
	const speed = useRaceClock((s) => s.speed);
	const advance = useRaceClock((s) => s.advance);
	(0, import_react.useEffect)(() => {
		if (!playing) return;
		let last = performance.now();
		let raf = 0;
		const loop = (now) => {
			const dt = Math.min(.05, (now - last) / 1e3);
			last = now;
			advance(dt * speed);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [
		playing,
		speed,
		advance
	]);
	return null;
}
function useKeyboardPlayback() {
	const toggle = useRaceClock((s) => s.toggle);
	const cycleSpeed = useRaceClock((s) => s.cycleSpeed);
	const restart = useRaceClock((s) => s.restart);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const el = e.target;
			if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
			if (e.code === "Space") {
				e.preventDefault();
				toggle();
			} else if (e.key === "s" || e.key === "S") cycleSpeed();
			else if (e.key === "r" || e.key === "R") restart();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		toggle,
		cycleSpeed,
		restart
	]);
}
function PitwallShell() {
	const elapsed = useRaceClock((s) => s.elapsed);
	const selected = useRaceClock((s) => s.selectedDriver);
	const selectDriver = useRaceClock((s) => s.selectDriver);
	const [tab, setTab] = (0, import_react.useState)("driver");
	const [mobileOpen, setMobileOpen] = (0, import_react.useState)(false);
	useKeyboardPlayback();
	const board = (0, import_react.useMemo)(() => Get_Live_Leaderboard(SESSION_KEY, elapsed), [elapsed]);
	const driver = (0, import_react.useMemo)(() => Get_Driver_List(SESSION_KEY), []).find((d) => d.driver_number === selected);
	const row = board.find((r) => r.driver_number === selected);
	const laps = (0, import_react.useMemo)(() => Get_Driver_Lap_History(SESSION_KEY, selected, elapsed), [selected, elapsed]);
	const pits = (0, import_react.useMemo)(() => Get_Pit_Stops(SESSION_KEY, elapsed), [elapsed]);
	const control = (0, import_react.useMemo)(() => Get_Race_Control_Until(SESSION_KEY, elapsed), [elapsed]);
	function pick(n) {
		selectDriver(n);
		setTab("driver");
		if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) setMobileOpen(true);
	}
	const side = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidePanel, {
		tab,
		onTab: setTab,
		driver,
		row,
		laps,
		pits,
		control
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RaceTicker, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimingHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RaceControlTicker, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 lg:flex-row sm:px-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Leaderboard, {
					rows: board,
					selected,
					onSelect: pick
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
					className: "panel hidden min-h-0 w-96 shrink-0 flex-col overflow-hidden lg:flex",
					children: side
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlaybackBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
				open: mobileOpen,
				onOpenChange: setMobileOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
					side: "bottom",
					className: "sheet-mobile",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, { children: "Car detail" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetDescription, { children: "Lap history, race control and pit stops." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-h-0 flex-1 overflow-hidden",
						children: side
					})]
				})
			})
		]
	});
}
function SidePanel({ tab, onTab, driver, row, laps, pits, control }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-1 p-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabBtn, {
					active: tab === "driver",
					onClick: () => onTab("driver"),
					children: "Driver"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabBtn, {
					active: tab === "control",
					onClick: () => onTab("control"),
					children: "Control"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabBtn, {
					active: tab === "pits",
					onClick: () => onTab("pits"),
					children: "Pits"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-h-0 flex-1 overflow-hidden",
			children: [
				tab === "driver" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DriverDetail, {
					driver,
					row,
					laps
				}),
				tab === "control" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full overflow-y-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RaceControlList, { messages: control })
				}),
				tab === "pits" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full overflow-y-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PitStopTable, { stops: pits })
				})
			]
		})]
	});
}
function TabBtn({ active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		variant: active ? "secondary" : "ghost",
		size: "sm",
		onClick,
		className: "flex-1",
		children
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-dvh bg-bg text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PitwallShell, {})
	});
}
//#endregion
export { Home as component };
