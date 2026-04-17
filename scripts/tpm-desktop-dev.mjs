import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import http from "node:http";

const repoRoot = process.cwd();
const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const electronBin = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const port = Number(process.env.TPM_DESKTOP_PORT || 3232);
const desktopUrl = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, attempts = 120) {
  for (let index = 0; index < attempts; index += 1) {
    if (await ping(url)) return true;
    await wait(1000);
  }
  return false;
}

function fileExists(file) {
  return Boolean(file) && fs.existsSync(file);
}

function quoteWindowsArg(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function spawnElectronProcess(command, args, options = {}) {
  if (process.platform !== "win32") {
    return spawn(command, args, options);
  }

  const psQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;
  const joined = `& ${psQuote(command)} ${args.map(psQuote).join(" ")}`;
  return spawn("powershell.exe", ["-NoProfile", "-Command", joined], options);
}

if (!fileExists(nextBin)) {
  console.error("Next runtime was not found. Run `npm install` before launching Trading Pro Max.");
  process.exit(1);
}

if (!fileExists(electronBin)) {
  console.error("Electron runtime was not found. Run `npm install` and then `npm run desktop:dev` again.");
  process.exit(1);
}

const nextProcess = spawn(process.execPath, [nextBin, "dev", "-p", String(port)], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PORT: String(port)
  },
  stdio: "inherit"
});

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!nextProcess.killed) nextProcess.kill();
  process.exit(code);
}

nextProcess.on("exit", (code) => {
  if (!shuttingDown && code && code !== 0) process.exit(code);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const ready = await waitForServer(desktopUrl);

if (!ready) {
  console.error(`Trading Pro Max desktop could not reach ${desktopUrl} in time.`);
  shutdown(1);
}

const electronProcess = spawnElectronProcess(electronBin, [path.join(repoRoot, "desktop", "main.cjs")], {
  cwd: repoRoot,
  env: {
    ...process.env,
    TPM_DESKTOP_URL: desktopUrl,
    TPM_DESKTOP_ROUTE: "/"
  },
  stdio: "inherit"
});

electronProcess.on("exit", (code) => {
  shutdown(code ?? 0);
});
