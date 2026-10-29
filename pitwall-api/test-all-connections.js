import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: "pitwall-api/.env" });

async function verify() {
  console.log("=== 1. TESTING MYSQL (AIVEN) ===");
  try {
    const pool = mysql.createPool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: { rejectUnauthorized: false },
    });
    const [tables] = await pool.query("SHOW TABLES");
    console.log("MySQL Connected successfully! Existing tables:");
    console.log(tables);

    const [procs] = await pool.query("SHOW PROCEDURE STATUS WHERE Db = ?", [process.env.DATABASE_NAME]);
    console.log("MySQL Stored Procedures count:", procs.length);
    console.log(procs.map(p => p.Name));
    await pool.end();
  } catch (err) {
    console.error("MySQL connection error:", err.message);
  }

  console.log("\n=== 2. TESTING MONGODB (ATLAS) ===");
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("pitwall");
    const cols = await db.listCollections().toArray();
    console.log("MongoDB Connected successfully! Collections in 'pitwall':");
    console.log(cols.map(c => c.name));
    await client.close();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
}

verify();
