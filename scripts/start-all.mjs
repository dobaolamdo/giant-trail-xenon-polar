import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";

const MONGO_BIN = "D:\\pitwall-mongodb\\bin\\mongod.exe";
const MONGO_DATA = "D:\\pitwall-mongodb\\data";
const MONGO_LOG = "D:\\pitwall-mongodb\\logs\\mongod.log";

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true); // port in use
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(port, maxWaitMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkPort(port)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  console.log("\n================================================================");
  console.log("🚀 KHỞI ĐỘNG HỆ THỐNG PITWALL FULL LOCAL");
  console.log("================================================================\n");

  // 1. Check & start MongoDB
  const mongoRunning = await checkPort(27017);
  if (mongoRunning) {
    console.log("✓ MongoDB Local đã đang chạy (Port 27017).");
  } else {
    if (existsSync(MONGO_BIN)) {
      process.stdout.write("⏳ Đang khởi động MongoDB Local trên Ổ D:... ");
      spawn(
        MONGO_BIN,
        [
          "--dbpath",
          MONGO_DATA,
          "--logpath",
          MONGO_LOG,
          "--port",
          "27017",
          "--bind_ip",
          "127.0.0.1",
        ],
        { detached: true, stdio: "ignore" }
      ).unref();
      const ok = await waitForPort(27017);
      console.log(ok ? "✓ Sẵn sàng!" : "⚠️ Khởi động chậm, đang kiểm tra ngầm.");
    } else {
      console.log(`⚠️ Không tìm thấy ${MONGO_BIN}. Vui lòng kiểm tra thư mục cài đặt.`);
    }
  }

  // 2. Check & start Express Backend API
  const apiRunning = await checkPort(3001);
  if (apiRunning) {
    console.log("✓ Backend API đã đang chạy (Port 3001).");
  } else {
    process.stdout.write("⏳ Đang khởi động Backend API (Port 3001)... ");
    spawn("node", ["pitwall-api/index.js"], {
      detached: true,
      stdio: "ignore",
    }).unref();
    const ok = await waitForPort(3001);
    console.log(ok ? "✓ Sẵn sàng!" : "⚠️ Đang nạp...");
  }

  // 3. Check & start Frontend Vite Dev Server
  const viteRunning = await checkPort(8080);
  if (viteRunning) {
    console.log("✓ Frontend Web đã đang chạy (Port 8080).");
  } else {
    process.stdout.write("⏳ Đang khởi động Frontend Vite (Port 8080)... ");
    const isWin = process.platform === "win32";
    spawn(
      isWin ? "cmd.exe" : "npx",
      isWin
        ? ["/c", "npx", "vite", "dev", "--host", "0.0.0.0", "--port", "8080"]
        : ["vite", "dev", "--host", "0.0.0.0", "--port", "8080"],
      { detached: true, stdio: "ignore" }
    ).unref();
    const ok = await waitForPort(8080, 10000);
    console.log(ok ? "✓ Sẵn sàng!" : "⚠️ Đang biên dịch SSR ngầm...");
  }

  console.log("\n================================================================");
  console.log("🎉 TOÀN BỘ HỆ THỐNG ĐÃ SẴN SÀNG:");
  console.log("  🌐 Web Dashboard:  http://localhost:8080");
  console.log("  ⚡ Backend API:    http://localhost:3001");
  console.log("  📡 MongoDB Local:  mongodb://127.0.0.1:27017/pitwall (Ổ D:)");
  console.log("================================================================");
  console.log("💡 Mẹo: Chạy 'npm run stop:all' hoặc click 'stop-all.bat' để dừng tất cả.\n");
}

main().catch(console.error);
