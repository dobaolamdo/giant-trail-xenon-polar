import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });
dotenv.config(); // fallback

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.ATLAS_MONGODB_URI ||
  process.env.LOCAL_MONGODB_URI ||
  "mongodb://127.0.0.1:27017/pitwall";
const DEFAULT_SESSION = 9606; // Singapore GP 2024

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 5, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn(`[HTTP 429 Rate Limited] Waiting ${delay * attempt}ms before retry...`);
        await sleep(delay * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[Attempt ${attempt} failed] ${err.message}. Retrying in ${delay * attempt}ms...`);
      await sleep(delay * attempt);
    }
  }
}

async function pumpSession(sessionKey = DEFAULT_SESSION, targetDriverList = null) {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING MONGODB BIG DATA PUMP FOR SESSION ${sessionKey}`);
  console.log(`======================================================`);

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
  });

  let connected = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`Connecting to MongoDB Atlas (Attempt ${attempt}/5)...`);
      await client.connect();
      await client.db("pitwall").command({ ping: 1 });
      console.log(`✓ Connected to MongoDB Atlas successfully!`);
      connected = true;
      break;
    } catch (err) {
      console.warn(`Connection attempt ${attempt} failed (${err.message}). Retrying in 1.5s...`);
      await sleep(1500);
    }
  }

  if (!connected) {
    throw new Error("Could not connect to MongoDB Atlas after 5 attempts.");
  }

  const db = client.db("pitwall");

  // 1. Fetch Session Info
  console.log(`\n[1/5] Fetching session info for ${sessionKey}...`);
  const sessionInfoArr = await fetchWithRetry(`https://api.openf1.org/v1/sessions?session_key=${sessionKey}`);
  const sessionInfo = sessionInfoArr?.[0];
  if (!sessionInfo) {
    console.error(`Session ${sessionKey} not found on OpenF1.`);
    await client.close();
    return;
  }
  console.log(`Race: ${sessionInfo.meeting_name || sessionInfo.circuit_short_name} (${sessionInfo.country_name}) - ${sessionInfo.year}`);
  
  await db.collection("sessions").updateOne(
    { session_key: sessionKey },
    { $set: { ...sessionInfo, updated_at: new Date() } },
    { upsert: true }
  );

  // 2. Fetch Drivers
  console.log(`\n[2/5] Fetching drivers for session ${sessionKey}...`);
  const drivers = await fetchWithRetry(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
  console.log(`Found ${drivers.length} drivers.`);
  if (drivers.length > 0) {
    for (const d of drivers) {
      if (d.driver_number == null) continue;
      await db.collection("drivers").updateOne(
        { session_key: sessionKey, driver_number: d.driver_number },
        { $set: { ...d, updated_at: new Date() } },
        { upsert: true }
      );
    }
  }

  // 3. Fetch Laps
  console.log(`\n[3/5] Fetching laps for session ${sessionKey}...`);
  const laps = await fetchWithRetry(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`);
  console.log(`Found ${laps.length} laps.`);
  if (laps.length > 0) {
    const lapOps = laps
      .filter((l) => l.driver_number != null && l.lap_number != null)
      .map((l) => ({
        updateOne: {
          filter: { session_key: sessionKey, driver_number: l.driver_number, lap_number: l.lap_number },
          update: { $set: { ...l, updated_at: new Date() } },
          upsert: true,
        },
      }));
    if (lapOps.length > 0) {
      await db.collection("laps").bulkWrite(lapOps);
    }
  }

  // 4. Ingest High-Frequency Telemetry & Location
  const telemetryCol = db.collection("telemetry_stream");
  const locationCol = db.collection("location_stream");

  // Determine drivers to pump
  const activeDrivers = drivers.filter(d => d.driver_number != null);
  let driversToPump = activeDrivers;
  if (Array.isArray(targetDriverList) && targetDriverList.length > 0) {
    driversToPump = activeDrivers.filter(d => targetDriverList.includes(d.driver_number));
  }

  console.log(`\n[4/5 & 5/5] Ingesting high-frequency telemetry and GPS locations for ${driversToPump.length} drivers...`);

  let totalTelemetryCount = 0;
  let totalLocationCount = 0;

  for (let idx = 0; idx < driversToPump.length; idx++) {
    const d = driversToPump[idx];
    const drvNum = d.driver_number;
    const name = d.broadcast_name || d.full_name || `#${drvNum}`;
    console.log(`\n>>> [Driver ${idx + 1}/${driversToPump.length}] #${drvNum} ${name}`);

    // A. Fetch & Pump car_data (telemetry)
    try {
      console.log(`  Fetching car_data (telemetry)...`);
      const carData = await fetchWithRetry(
        `https://api.openf1.org/v1/car_data?session_key=${sessionKey}&driver_number=${drvNum}`
      );
      if (Array.isArray(carData) && carData.length > 0) {
        // Convert to Time-Series document
        const docs = carData.map((cd) => ({
          date: new Date(cd.date),
          meta: { session_key: sessionKey, driver_number: drvNum },
          speed: cd.speed ?? 0,
          rpm: cd.rpm ?? 0,
          gear: cd.n_gear ?? 0,
          throttle: cd.throttle ?? 0,
          brake: cd.brake ?? 0,
          drs: cd.drs ?? 0,
        }));

        // Batch insert in chunks of 5000
        const CHUNK_SIZE = 5000;
        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
          const chunk = docs.slice(i, i + CHUNK_SIZE);
          await telemetryCol.insertMany(chunk, { ordered: false });
        }
        totalTelemetryCount += docs.length;
        console.log(`  ✓ Inserted ${docs.length.toLocaleString()} telemetry points.`);
      } else {
        console.log(`  No car_data found.`);
      }
    } catch (err) {
      console.error(`  ✗ Error pumping car_data for driver ${drvNum}:`, err.message);
    }

    await sleep(200);

    // B. Fetch & Pump location (GPS coordinates)
    try {
      console.log(`  Fetching location (GPS)...`);
      const locData = await fetchWithRetry(
        `https://api.openf1.org/v1/location?session_key=${sessionKey}&driver_number=${drvNum}`
      );
      if (Array.isArray(locData) && locData.length > 0) {
        const docs = locData.map((ld) => ({
          date: new Date(ld.date),
          meta: { session_key: sessionKey, driver_number: drvNum },
          x: ld.x ?? 0,
          y: ld.y ?? 0,
          z: ld.z ?? 0,
        }));

        const CHUNK_SIZE = 5000;
        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
          const chunk = docs.slice(i, i + CHUNK_SIZE);
          await locationCol.insertMany(chunk, { ordered: false });
        }
        totalLocationCount += docs.length;
        console.log(`  ✓ Inserted ${docs.length.toLocaleString()} GPS coordinates.`);
      } else {
        console.log(`  No location found.`);
      }
    } catch (err) {
      console.error(`  ✗ Error pumping location for driver ${drvNum}:`, err.message);
    }

    await sleep(200);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 PUMP COMPLETED FOR SESSION ${sessionKey}!`);
  console.log(`Total Telemetry records ingested: ${totalTelemetryCount.toLocaleString()}`);
  console.log(`Total GPS Location records ingested: ${totalLocationCount.toLocaleString()}`);
  console.log(`TOTAL BIG DATA RECORDS INGESTED: ${(totalTelemetryCount + totalLocationCount).toLocaleString()}`);
  console.log(`======================================================\n`);

  await client.close();
}

// Read CLI arguments:
// node pump-mongo.js [session_key] [--drivers 1,4,16] [--limit 5]
const args = process.argv.slice(2);
let sessionKey = DEFAULT_SESSION;
let targetDrivers = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--drivers" && args[i + 1]) {
    targetDrivers = args[i + 1].split(",").map(Number);
    i++;
  } else if (!isNaN(Number(args[i]))) {
    sessionKey = Number(args[i]);
  }
}

pumpSession(sessionKey, targetDrivers).catch(console.error);
