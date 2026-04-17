import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const stageRoot = path.join(repoRoot, "desktop", "build-source");
const buildOutput = path.join(repoRoot, "desktop", "build-runtime");
const distOutput = path.join(repoRoot, "desktop", "dist");
const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const nodeBinaryName = process.platform === "win32" ? "node.exe" : "node";
const builderBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron-builder.cmd" : "electron-builder"
);

const productRouteDirs = [
  "execution-center",
  "market-intelligence",
  "strategy-lab",
  "risk-control",
  "ai-copilot",
  "journal-vault"
];

function exists(target) {
  return fs.existsSync(target);
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function cleanDir(target) {
  fs.rmSync(target, { recursive: true, force: true });
  ensureDir(target);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const env = options.env || process.env;
    const cwd = options.cwd || repoRoot;
    const child =
      process.platform === "win32"
        ? spawn(
            "powershell.exe",
            [
              "-NoProfile",
              "-Command",
              `& '${String(command).replace(/'/g, "''")}' ${args
                .map((arg) => `'${String(arg).replace(/'/g, "''")}'`)
                .join(" ")}`
            ],
            {
              cwd,
              env,
              stdio: "inherit",
              windowsHide: true
            }
          )
        : spawn(command, args, {
            cwd,
            env,
            stdio: "inherit",
            windowsHide: true
          });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

function syncFile(source, target) {
  if (!exists(source)) return;
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function syncDirectory(source, target) {
  if (!exists(source)) return;
  fs.rmSync(target, { recursive: true, force: true });
  ensureDir(path.dirname(target));
  fs.cpSync(source, target, { recursive: true, force: true });
}

function syncJsonDirectory(source, target) {
  if (!exists(source)) return;
  fs.rmSync(target, { recursive: true, force: true });
  ensureDir(target);

  for (const entry of fs.readdirSync(source)) {
    if (!entry.endsWith(".json")) continue;
    fs.copyFileSync(path.join(source, entry), path.join(target, entry));
  }
}

function findStandaloneRoot() {
  const standaloneBase = path.join(stageRoot, ".next", "standalone");
  const directServer = path.join(standaloneBase, "server.js");
  if (exists(directServer)) return standaloneBase;

  const queue = [standaloneBase];
  while (queue.length) {
    const current = queue.shift();
    if (!current || !exists(current)) continue;

    const serverFile = path.join(current, "server.js");
    if (exists(serverFile)) return current;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) queue.push(path.join(current, entry.name));
    }
  }

  return null;
}

function writeStagePackageFiles() {
  const stagePackage = {
    name: "trading-pro-max-packaging-stage",
    private: true
  };

  const stageTsconfig = {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: false,
      noEmit: true,
      incremental: true,
      module: "esnext",
      esModuleInterop: true,
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "react-jsx",
      plugins: [{ name: "next" }]
    },
    include: [
      "next-env.d.ts",
      ".next/types/**/*.ts",
      ".next/dev/types/**/*.ts",
      "app/**/*",
      "lib/**/*.mjs"
    ],
    exclude: ["node_modules"]
  };

  fs.writeFileSync(path.join(stageRoot, "package.json"), JSON.stringify(stagePackage, null, 2));
  fs.writeFileSync(
    path.join(stageRoot, "next.config.js"),
    `/** @type {import("next").NextConfig} */\nmodule.exports = {\n  output: "standalone",\n  turbopack: {\n    root: ${JSON.stringify(repoRoot.replace(/\\/g, "/"))},\n  },\n};\n`
  );
  fs.writeFileSync(path.join(stageRoot, "tsconfig.json"), JSON.stringify(stageTsconfig, null, 2));
}

function stageProductWorkspace() {
  cleanDir(stageRoot);

  syncFile(path.join(repoRoot, "next-env.d.ts"), path.join(stageRoot, "next-env.d.ts"));
  syncFile(path.join(repoRoot, "app", "layout.js"), path.join(stageRoot, "app", "layout.js"));
  syncFile(path.join(repoRoot, "app", "page.js"), path.join(stageRoot, "app", "page.js"));
  syncDirectory(path.join(repoRoot, "app", "_components"), path.join(stageRoot, "app", "_components"));

  for (const routeDir of productRouteDirs) {
    syncDirectory(path.join(repoRoot, "app", routeDir), path.join(stageRoot, "app", routeDir));
  }

  syncFile(path.join(repoRoot, "lib", "tpm-runtime.mjs"), path.join(stageRoot, "lib", "tpm-runtime.mjs"));
  syncDirectory(path.join(repoRoot, "data"), path.join(stageRoot, "data"));
  syncJsonDirectory(path.join(repoRoot, ".tpm"), path.join(stageRoot, ".tpm"));
  syncDirectory(path.join(repoRoot, "public"), path.join(stageRoot, "public"));
  syncFile(path.join(repoRoot, ".env.production"), path.join(stageRoot, ".env.production"));
  syncFile(path.join(repoRoot, ".env.connectors"), path.join(stageRoot, ".env.connectors"));

  writeStagePackageFiles();
}

function assembleRuntimeBundle() {
  const standaloneRoot = findStandaloneRoot();
  const standaloneNodeModules = path.join(stageRoot, ".next", "standalone", "node_modules");
  if (!standaloneRoot || !exists(path.join(standaloneRoot, "server.js"))) {
    throw new Error("Staged standalone runtime was not created. Packaging cannot continue.");
  }

  cleanDir(buildOutput);
  syncDirectory(standaloneRoot, buildOutput);
  syncDirectory(standaloneNodeModules, path.join(buildOutput, "runtime-deps"));
  syncDirectory(path.join(stageRoot, ".next", "static"), path.join(buildOutput, ".next", "static"));
  syncDirectory(path.join(stageRoot, "public"), path.join(buildOutput, "public"));
  syncDirectory(path.join(stageRoot, "data"), path.join(buildOutput, "data"));
  syncDirectory(path.join(stageRoot, "lib"), path.join(buildOutput, "lib"));
  syncJsonDirectory(path.join(stageRoot, ".tpm"), path.join(buildOutput, ".tpm"));
  syncFile(path.join(stageRoot, ".env.production"), path.join(buildOutput, ".env.production"));
  syncFile(path.join(stageRoot, ".env.connectors"), path.join(buildOutput, ".env.connectors"));
  syncFile(process.execPath, path.join(buildOutput, nodeBinaryName));
}

async function main() {
  if (!exists(nextBin)) {
    throw new Error("Next runtime was not found. Run `npm install` before building the Windows distributable.");
  }

  if (!exists(builderBin)) {
    throw new Error("electron-builder is not installed. Run `npm install` before building the Windows distributable.");
  }

  stageProductWorkspace();

  await run(process.execPath, [nextBin, "build"], {
    cwd: stageRoot,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1"
    }
  });

  assembleRuntimeBundle();
  cleanDir(distOutput);

  await run(builderBin, ["--win", "nsis"], {
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: "false"
    }
  });

  process.stdout.write("Trading Pro Max Windows distributable generated under desktop/dist\n");
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
