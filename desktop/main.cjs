const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const desktopPort = Number(process.env.TPM_DESKTOP_PORT || 3232);
const desktopRoute = process.env.TPM_DESKTOP_ROUTE || "/";
const bootFile = path.join(__dirname, "boot.html");
const fallbackFile = path.join(__dirname, "fallback.html");
const configFile = path.join(__dirname, "config.json");
let mainWindow;
let serverProcess;
let bootstrapStarted = false;
let workspaceLoaded = false;
let workspaceNavigationInFlight = false;
let fallbackShown = false;
let bootTimeoutHandle = null;
let resolvedDesktopUrl = process.env.TPM_DESKTOP_URL ? String(process.env.TPM_DESKTOP_URL).replace(/\/+$/, "") : "";
let runtimeLogBuffer = "";

function readDesktopConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile, "utf8"));
  } catch {
    return {};
  }
}

const desktopConfig = readDesktopConfig();
const APP_NAME = desktopConfig.identity?.appName || desktopConfig.productName || "Trading Pro Max";
const APP_TITLE = desktopConfig.identity?.windowTitle || desktopConfig.title || APP_NAME;
const APP_ABOUT_TITLE = desktopConfig.identity?.aboutTitle || desktopConfig.identity?.desktopTitle || `${APP_NAME} Desktop`;
const APP_CHANNEL =
  desktopConfig.release?.channelLabel || (app.isPackaged ? "Windows Desktop Release" : "Local Desktop Session");
const APP_SUPPORT_LABEL = desktopConfig.identity?.supportLabel || "Desktop Support";
const APP_VERSION = desktopConfig.version || app.getVersion();
const packagedBootTimeoutMs = Number(
  process.env.TPM_DESKTOP_BOOT_TIMEOUT || desktopConfig.startup?.packagedBootTimeoutMs || 12000
);
const packagedRecoveryWindowMs = Number(
  process.env.TPM_DESKTOP_RECOVERY_WINDOW || desktopConfig.startup?.packagedRecoveryWindowMs || 12000
);

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
    if (serverProcess && serverProcess.exitCode !== null) return false;
    if (await ping(url)) return true;
    await wait(1000);
  }
  return false;
}

function getWorkspaceBaseUrl() {
  return resolvedDesktopUrl || `http://127.0.0.1:${desktopPort}`;
}

function getPackagedRuntimeRoot() {
  const candidates = [
    path.join(process.resourcesPath, "app-runtime"),
    path.join(__dirname, "..", ".next", "standalone")
  ];

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, "server.js")));
}

function getPackagedNodeBinary(runtimeRoot) {
  const candidates = [
    path.join(runtimeRoot, "node.exe"),
    path.join(runtimeRoot, "node")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function getPackagedRuntimeDependencyPath(runtimeRoot) {
  const candidates = [
    path.join(runtimeRoot, "runtime-deps"),
    path.join(runtimeRoot, "node_modules")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function getRuntimeLogFile() {
  try {
    return path.join(app.getPath("userData"), "desktop-runtime.log");
  } catch {
    return path.join(process.cwd(), "desktop-runtime.log");
  }
}

function appendRuntimeLog(message) {
  if (!message) return;
  runtimeLogBuffer = `${runtimeLogBuffer}${message}`.slice(-8000);
  try {
    fs.appendFileSync(getRuntimeLogFile(), message);
  } catch {}
}

function clearBootTimeout() {
  if (!bootTimeoutHandle) return;
  clearTimeout(bootTimeoutHandle);
  bootTimeoutHandle = null;
}

async function showFallback(reason) {
  if (!mainWindow || fallbackShown || workspaceLoaded || workspaceNavigationInFlight) return;
  fallbackShown = true;
  clearBootTimeout();
  appendRuntimeLog(`[${new Date().toISOString()}] ${reason}\n`);
  await mainWindow.loadFile(fallbackFile);
}

async function navigateToWorkspaceUrl(baseUrl, source) {
  if (!mainWindow || fallbackShown || workspaceLoaded || workspaceNavigationInFlight) return;
  workspaceNavigationInFlight = true;
  appendRuntimeLog(`[${new Date().toISOString()}] ${source} navigating to ${baseUrl}${desktopRoute}\n`);

  try {
    await mainWindow.loadURL(`${baseUrl}${desktopRoute}`);
  } finally {
    workspaceNavigationInFlight = false;
  }
}

function armBootTimeout() {
  if (!app.isPackaged || fallbackShown) return;
  clearBootTimeout();
  bootTimeoutHandle = setTimeout(() => {
    void (async () => {
      if (workspaceLoaded || fallbackShown || !mainWindow) return;
      appendRuntimeLog(
        `[${new Date().toISOString()}] Packaged startup timeout reached after ${packagedBootTimeoutMs}ms.\n`
      );

      try {
        const baseUrl = await ensureWorkspaceBaseUrl();
        const recoveryAttempts = Math.max(1, Math.ceil(packagedRecoveryWindowMs / 1000));
        const recovered = (await ping(baseUrl)) || (await waitForServer(baseUrl, recoveryAttempts));
        if (recovered && !fallbackShown && !workspaceLoaded && mainWindow) {
          await navigateToWorkspaceUrl(baseUrl, "Timeout recovery");
          return;
        }
      } catch (error) {
        appendRuntimeLog(`[${new Date().toISOString()}] Timeout recovery failed: ${String(error)}\n`);
      }

      await showFallback("Packaged startup timeout fell back to the fallback screen.");
    })();
  }, packagedBootTimeoutMs);
}

function stopEmbeddedServer() {
  clearBootTimeout();
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
  serverProcess = null;
}

function startEmbeddedServer() {
  if (serverProcess) return getWorkspaceBaseUrl();

  const runtimeRoot = getPackagedRuntimeRoot();
  if (!runtimeRoot) {
    throw new Error("Packaged Trading Pro Max runtime is missing.");
  }

  const nodeBinary = getPackagedNodeBinary(runtimeRoot);
  if (!nodeBinary) {
    throw new Error("Bundled Node runtime is missing from the packaged Trading Pro Max app.");
  }

  const runtimeDependencyPath = getPackagedRuntimeDependencyPath(runtimeRoot);
  if (!runtimeDependencyPath) {
    throw new Error("Bundled runtime dependencies are missing from the packaged Trading Pro Max app.");
  }

  const serverFile = path.join(runtimeRoot, "server.js");
  resolvedDesktopUrl = `http://127.0.0.1:${desktopPort}`;
  runtimeLogBuffer = "";
  appendRuntimeLog(`[${new Date().toISOString()}] Starting embedded runtime from ${runtimeRoot}\n`);
  serverProcess = spawn(nodeBinary, [serverFile], {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_ENV: "production",
      NODE_PATH: process.env.NODE_PATH
        ? `${runtimeDependencyPath}${path.delimiter}${process.env.NODE_PATH}`
        : runtimeDependencyPath,
      PORT: String(desktopPort)
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  serverProcess.stdout?.on("data", (chunk) => appendRuntimeLog(String(chunk)));
  serverProcess.stderr?.on("data", (chunk) => appendRuntimeLog(String(chunk)));
  serverProcess.on("error", (error) => {
    appendRuntimeLog(`[${new Date().toISOString()}] Embedded runtime error: ${String(error)}\n`);
  });
  serverProcess.on("exit", (code, signal) => {
    appendRuntimeLog(
      `[${new Date().toISOString()}] Embedded runtime exited code=${code ?? "null"} signal=${signal ?? "null"}.\n`
    );
    serverProcess = null;
    if (app.isPackaged && !workspaceLoaded && !fallbackShown) {
      void showFallback("Embedded runtime exited before the workspace finished loading.");
    }
  });

  return resolvedDesktopUrl;
}

async function ensureWorkspaceBaseUrl() {
  if (resolvedDesktopUrl) return resolvedDesktopUrl;
  if (app.isPackaged) return startEmbeddedServer();
  resolvedDesktopUrl = `http://127.0.0.1:${desktopPort}`;
  return resolvedDesktopUrl;
}

async function navigateTo(route = "/") {
  const baseUrl = await ensureWorkspaceBaseUrl();
  await mainWindow?.loadURL(`${baseUrl}${route}`);
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: APP_NAME,
      submenu: [
        {
          label: `About ${APP_ABOUT_TITLE}`,
          click: () =>
            dialog.showMessageBox({
              type: "info",
              title: APP_ABOUT_TITLE,
              message: `${APP_NAME} is running.`,
              detail: `${APP_CHANNEL}\n${desktopConfig.release?.versionLabel || `Version ${APP_VERSION}`}\n${
                APP_SUPPORT_LABEL
              }: ${getRuntimeLogFile()}`
            })
        },
        { type: "separator" },
        { label: "Reload Workspace", accelerator: "CmdOrCtrl+R", click: () => mainWindow?.reload() },
        { label: desktopConfig.release?.versionLabel || `Version ${APP_VERSION}`, enabled: false },
        { type: "separator" },
        { role: "quit", label: `Quit ${APP_NAME}` }
      ]
    },
    {
      label: "Workspace",
      submenu: [
        { label: "Open Product Workspace", accelerator: "CmdOrCtrl+1", click: () => void navigateTo("/") },
        { label: "Execution Center", accelerator: "CmdOrCtrl+2", click: () => void navigateTo("/execution-center") },
        { label: "Market Intelligence", accelerator: "CmdOrCtrl+3", click: () => void navigateTo("/market-intelligence") },
        { label: "Strategy Lab", accelerator: "CmdOrCtrl+4", click: () => void navigateTo("/strategy-lab") },
        { label: "Risk Control", accelerator: "CmdOrCtrl+5", click: () => void navigateTo("/risk-control") },
        { label: "AI Copilot", accelerator: "CmdOrCtrl+6", click: () => void navigateTo("/ai-copilot") },
        { label: "Journal Vault", accelerator: "CmdOrCtrl+7", click: () => void navigateTo("/journal-vault") }
      ]
    },
    {
      label: "Shortcuts",
      submenu: [
        { label: "Quick Launcher Placeholder", accelerator: "CmdOrCtrl+K", enabled: false },
        { label: "Desktop Shortcut Placeholder", enabled: false },
        { label: "Safe Startup Flow Active", enabled: false }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Release Details",
          click: () =>
            dialog.showMessageBox({
              type: "info",
              title: APP_ABOUT_TITLE,
              message: `${APP_CHANNEL}`,
              detail:
                "Trading Pro Max boots the real product workspace inside Electron. Installed Windows builds launch the bundled standalone runtime automatically."
            })
        },
        {
          label: "Open Support Folder",
          click: () => {
            const logFile = getRuntimeLogFile();
            const supportFolder = fs.existsSync(logFile) ? path.dirname(logFile) : app.getPath("userData");
            void shell.openPath(supportFolder);
          }
        }
      ]
    }
  ]);
}

async function bootstrapWorkspace() {
  if (bootstrapStarted || !mainWindow) return;
  bootstrapStarted = true;
  armBootTimeout();

  try {
    const baseUrl = await ensureWorkspaceBaseUrl();
    const ready = await waitForServer(baseUrl, app.isPackaged ? 180 : 120);
    if (!ready) throw new Error(`Workspace did not respond at ${baseUrl}.`);
    if (fallbackShown || workspaceLoaded || !mainWindow) return;
    await navigateToWorkspaceUrl(baseUrl, "Bootstrap");
  } catch {
    await showFallback("Workspace startup fell back to the fallback screen.");
  }
}

function createWindow() {
  workspaceLoaded = false;
  workspaceNavigationInFlight = false;
  fallbackShown = false;
  clearBootTimeout();
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1020,
    minWidth: 1360,
    minHeight: 860,
    backgroundColor: "#020617",
    title: APP_TITLE,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(bootFile);
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-finish-load", () => {
    const currentUrl = mainWindow?.webContents.getURL() || "";
    if (currentUrl.startsWith("http")) {
      workspaceLoaded = true;
      workspaceNavigationInFlight = false;
      clearBootTimeout();
      appendRuntimeLog(`[${new Date().toISOString()}] Workspace loaded ${currentUrl}\n`);
    }

    if (currentUrl.startsWith("file:")) {
      armBootTimeout();
      void bootstrapWorkspace();
    }
  });

  mainWindow.webContents.on("did-fail-load", () => {
    void showFallback("Workspace navigation failed to load.");
  });
}

app.whenReady().then(() => {
  app.setName(APP_NAME);
  app.setAppUserModelId("com.tradingpromax.desktop");
  Menu.setApplicationMenu(buildMenu());
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      bootstrapStarted = false;
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  stopEmbeddedServer();
});

app.on("window-all-closed", () => {
  stopEmbeddedServer();
  if (process.platform !== "darwin") app.quit();
});
