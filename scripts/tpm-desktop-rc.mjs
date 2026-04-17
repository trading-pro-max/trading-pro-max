import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const desktopDir = path.join(root, "desktop");
const releaseDir = path.join(desktopDir, "release-candidate");
const packageFile = path.join(root, "package.json");
const configFile = path.join(desktopDir, "config.json");
const desktopEntry = path.join(desktopDir, "main.cjs");
const bootFile = path.join(desktopDir, "boot.html");
const fallbackFile = path.join(desktopDir, "fallback.html");
const iconPlaceholder = path.join(desktopDir, "assets", "trading-pro-max-placeholder.svg");
const desktopDevScript = path.join(root, "scripts", "tpm-desktop-dev.mjs");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function assertExists(file, label) {
  if (!fs.existsSync(file)) {
    throw new Error(`${label} was not found: ${file}`);
  }
}

function writeFile(file, contents) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, contents, "utf8");
}

assertExists(packageFile, "package.json");
assertExists(configFile, "desktop config");
assertExists(desktopEntry, "desktop entry");
assertExists(bootFile, "desktop boot screen");
assertExists(fallbackFile, "desktop fallback screen");
assertExists(iconPlaceholder, "desktop icon placeholder");
assertExists(desktopDevScript, "desktop dev launcher");

const pkg = readJson(packageFile);
const desktopConfig = readJson(configFile);
const generatedAt = new Date().toISOString();

const manifest = {
  appName: pkg.productName || "Trading Pro Max",
  title: desktopConfig.title || "Trading Pro Max Desktop",
  channel: desktopConfig.channel || "local-release-candidate",
  generatedAt,
  runtime: {
    webCommand: "npm run web:dev",
    desktopCommand: "npm run desktop:dev",
    releaseCommand: "npm run desktop:rc"
  },
  files: {
    desktopEntry: path.relative(root, desktopEntry),
    bootFile: path.relative(root, bootFile),
    fallbackFile: path.relative(root, fallbackFile),
    iconPlaceholder: path.relative(root, iconPlaceholder)
  },
  notes: [
    "This is a local release-candidate preparation artifact, not a signed distributable installer.",
    "Use the desktop dev launcher for the current packaged-desktop direction."
  ]
};

const instructions = `# Trading Pro Max Local Release Candidate

Generated: ${generatedAt}

## Run Web

\`npm run web:dev\`

## Run Desktop

\`npm run desktop:dev\`

## Local Release-Candidate Prep

\`npm run desktop:rc\`

This generates a local release-candidate manifest and instruction bundle under \`desktop/release-candidate/\`.

## Notes

- Current repo direction uses the Electron desktop shell with the local Next product server.
- This local RC prep does not produce a signed installer or public distributable package.
`;

ensureDir(releaseDir);
writeFile(path.join(releaseDir, "manifest.json"), JSON.stringify(manifest, null, 2));
writeFile(path.join(releaseDir, "README.md"), instructions);

console.log(`Trading Pro Max local release candidate prepared at ${path.relative(root, releaseDir)}`);
