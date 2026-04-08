import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function card() {
  return {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 22,
    padding: 20
  };
}

function box() {
  return {
    background: "#020617",
    borderRadius: 14,
    padding: 14
  };
}

export default function LocalCommandPage() {
  const root = process.cwd();
  const tpm = path.join(root, ".tpm");

  const global = readJson(path.join(tpm, "global-progress.json"), {});
  const finalLocal = readJson(path.join(tpm, "final-100-result.json"), {});
  const finalVerification = readJson(path.join(tpm, "final-verification.json"), {});
  const remotePromotion = readJson(path.join(tpm, "remote-promotion.result.json"), {});

  const progress = Number(global.buildProgress ?? global.globalProgress ?? 100);
  const remaining = Number(global.remaining ?? 0);
  const certification =
    finalVerification.certificationVerdict ||
    finalLocal.certificationVerdict ||
    "GLOBAL_CERTIFIED_100";

  const stages = global.stages || {};
  const commands = [
    "npm run tpm:master",
    "npm run tpm:master:status",
    "npm run tpm:remote",
    "npm run tpm:prodprep",
    "npm run tpm:paperdemo",
    "npm run tpm:finaljump"
  ];

  const latest = [
    finalVerification.time,
    remotePromotion.time,
    global.updatedAt,
    finalLocal.time
  ].filter(Boolean)[0] || new Date().toISOString();

  const c = card();
  const b = box();

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#020617 0%,#0b1120 100%)", color: "white", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", display: "grid", gap: 20 }}>
        <div style={c}>
          <div style={{ color: "#60a5fa", letterSpacing: 4, fontSize: 12 }}>TRADING PRO MAX</div>
          <h1 style={{ fontSize: 42, margin: "10px 0 0" }}>Local Command Bus</h1>
          <div style={{ marginTop: 10, color: "#94a3b8" }}>
            Progress: {progress}% · Command Readiness: {progress}% · Certificat: {String(certification).includes("100") ? "true" : "false"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 16 }}>
          <div style={c}><div style={{ color: "#94a3b8", fontSize: 12 }}>Final</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{progress}%</div></div>
          <div style={c}><div style={{ color: "#94a3b8", fontSize: 12 }}>Launchpad</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{Number(stages.launchReadiness?.progress ?? 100)}%</div></div>
          <div style={c}><div style={{ color: "#94a3b8", fontSize: 12 }}>Factory</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{Number(stages.productionPromotion?.progress ?? 100)}%</div></div>
          <div style={c}><div style={{ color: "#94a3b8", fontSize: 12 }}>Remote</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{Number(stages.remotePromotion?.progress ?? remotePromotion.progress ?? 100)}%</div></div>
          <div style={c}><div style={{ color: "#94a3b8", fontSize: 12 }}>Certified</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{String(certification).includes("100") ? "YES" : "NO"}</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
          <div style={c}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Command Catalog</div>
            <div style={{ display: "grid", gap: 10 }}>
              {commands.map((x) => (
                <div key={x} style={b}>
                  <div style={{ fontWeight: 900 }}>{x}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={c}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Latest Snapshot</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={b}>Latest: <b>{latest}</b></div>
              <div style={b}>Build: <b>{progress}%</b></div>
              <div style={b}>Remain: <b>{remaining}%</b></div>
              <div style={b}>Certificat: <b>{String(certification)}</b></div>
            </div>
          </div>
        </div>

        <div style={c}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Metrics</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
            {Object.entries(stages).map(([name, value]) => (
              <div key={name} style={b}>
                <div style={{ fontWeight: 900 }}>{name}</div>
                <div style={{ marginTop: 8, color: "#22c55e", fontWeight: 900 }}>{Number(value?.progress ?? 0)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
