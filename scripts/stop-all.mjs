import { execSync } from "node:child_process";

const PORTS = [27017, 3001, 8080];

function getPidsForPort(port) {
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const pids = new Set();
    const lines = stdout.split("\n");
    for (const line of lines) {
      if (line.includes("LISTENING")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(Number(pid))) {
          pids.add(Number(pid));
        }
      }
    }
    return Array.from(pids);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  console.log("\n================================================================");
  console.log("🛑 ĐANG DỪNG TOÀN BỘ CÁC DỊCH VỤ PITWALL...");
  console.log("================================================================\n");

  let killedCount = 0;

  for (const port of PORTS) {
    const pids = getPidsForPort(port);
    if (pids.length > 0) {
      for (const pid of pids) {
        const ok = killPid(pid);
        if (ok) {
          console.log(`✓ Đã tắt tiến trình PID ${pid} trên cổng ${port}`);
          killedCount++;
        }
      }
    } else {
      console.log(`- Cổng ${port}: Không có tiến trình nào đang chạy.`);
    }
  }

  // Gracefully make sure mongod is stopped if running
  try {
    execSync("taskkill /F /IM mongod.exe", { stdio: "ignore" });
    console.log("✓ Đã giải phóng hoàn toàn mongod.exe");
  } catch {}

  console.log("\n================================================================");
  console.log(`✨ Hoàn tất! Tất cả cổng (${PORTS.join(", ")}) đã được giải phóng sạch sẽ.`);
  console.log("================================================================\n");
}

main();
