import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });
dotenv.config();

const uri =
  process.env.MONGODB_URI ||
  process.env.ATLAS_MONGODB_URI ||
  process.env.LOCAL_MONGODB_URI ||
  "mongodb://127.0.0.1:27017/pitwall";

let cachedClient = null;

export async function getMongoClient(maxRetries = 5) {
  if (cachedClient) {
    try {
      await cachedClient.db("admin").command({ ping: 1 });
      return cachedClient;
    } catch {
      cachedClient = null;
    }
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.connect();
      await client.db("pitwall").command({ ping: 1 });
      cachedClient = client;
      return cachedClient;
    } catch (err) {
      if (attempt === 1 && uri.includes("127.0.0.1")) {
        console.log("⚡ [Local Mongo] MongoDB chưa bật. Đang tự khởi động mongod từ D:\\pitwall-mongodb...");
        try {
          const { spawn } = await import("child_process");
          const child = spawn(
            "D:\\pitwall-mongodb\\bin\\mongod.exe",
            [
              "--dbpath", "D:\\pitwall-mongodb\\data",
              "--logpath", "D:\\pitwall-mongodb\\logs\\mongod.log",
              "--port", "27017",
              "--bind_ip", "127.0.0.1",
            ],
            { detached: true, stdio: "ignore" }
          );
          child.unref();
          await new Promise((r) => setTimeout(r, 3500));
          continue;
        } catch {}
      }
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Failed to connect to MongoDB Atlas after retries.");
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db("pitwall");
}
