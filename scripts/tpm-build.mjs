import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM_DIR = path.join(ROOT, ".tpm");
const MANIFEST_FILE = path.join(TPM_DIR, "manifest.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

const manifest = readJson(MANIFEST_FILE, { productName: "Trading Pro Max", systemTitle: "Global Operating System", modules: [] });

const layoutJs = `
import { getManifest } from "../lib/tpm-runtime.js";

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  const manifest = getManifest();

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020617", color: "white", fontFamily: "Arial, sans-serif" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #1f2937", background: "rgba(2,6,23,.92)", backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: 1600, margin: "0 auto", padding: "14px 20px", display: "grid", gap: 12 }}>
            <div>
              <div style={{ color: "#60a5fa", letterSpacing: 4, fontSize: 11 }}>{manifest.productName.toUpperCase()}</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{manifest.systemTitle}</div>
            </div>
            <nav style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href="/" style={{ color: "white", textDecoration: "none", border: "1px solid #334155", background: "#0b1220", padding: "10px 12px", borderRadius: 12, fontWeight: 800, fontSize: 14 }}>Home</a>
              {manifest.modules.map((m) => (
                <a
                  key={m.slug}
                  href={\`/\${m.slug}\`}
                  style={{ color: "white", textDecoration: "none", border: "1px solid #334155", background: "#0b1220", padding: "10px 12px", borderRadius: 12, fontWeight: 800, fontSize: 14 }}
                >
                  {m.title}
                </a>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
`;

const homeJs = `
import { getShellSummary } from "../lib/tpm-runtime.js";

export const dynamic = "force-dynamic";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function HomePage() {
  const shell = getShellSummary();
  const c = card();
  const b = box();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>{shell.productName.toUpperCase()}</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>{shell.systemTitle}</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Builder Progress: {shell.progress}% · Builder Readiness: {shell.readiness}% · Modules: {shell.modules.length}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(8,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Cash</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.cash}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Positions</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.positions}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Watchlist</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.watchlist}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Alerts</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.alerts}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Orders</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.orders}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Ledger</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.ledger}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Users</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.users}</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Snapshots</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{shell.metrics.snapshots}</div></div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Builder Modules</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {shell.modules.map((m) => (
              <a key={m.slug} href={m.href} style={{ ...b, textDecoration:"none", color:"white" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:900 }}>{m.title}</div>
                  <div style={{ color:"#22c55e", fontWeight:900 }}>{m.progress}%</div>
                </div>
                <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>{m.stage}</div>
                <div style={{ marginTop:6, color:"#cbd5e1", fontSize:13 }}>{m.description}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
`;

const apiHealthJs = `
import { NextResponse } from "next/server";
import { getShellSummary } from "../../../lib/tpm-runtime.js";

export async function GET() {
  return NextResponse.json({ ok: true, shell: getShellSummary() });
}
`;

write(path.join(ROOT, "app", "layout.js"), layoutJs);
write(path.join(ROOT, "app", "page.js"), homeJs);
write(path.join(ROOT, "app", "api", "health", "route.js"), apiHealthJs);

for (const moduleDef of manifest.modules) {
  const slug = moduleDef.slug;
  const title = moduleDef.title;

  const pageJs = `
import { notFound } from "next/navigation";
import { getModuleDataBySlug } from "../../lib/tpm-runtime.js";

export const dynamic = "force-dynamic";

const SLUG = "${slug}";

function card() {
  return { background:"#111827", border:"1px solid #1f2937", borderRadius:22, padding:20 };
}

function box() {
  return { background:"#020617", borderRadius:14, padding:14 };
}

export default function ModulePage() {
  const data = getModuleDataBySlug(SLUG);
  if (!data) notFound();

  const c = card();
  const b = box();

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)", color:"white", padding:24, fontFamily:"Arial, sans-serif" }}>
      <div style={{ maxWidth:1600, margin:"0 auto", display:"grid", gap:20 }}>
        <div style={c}>
          <div style={{ color:"#60a5fa", letterSpacing:4, fontSize:12 }}>{data.productName.toUpperCase()}</div>
          <h1 style={{ fontSize:42, margin:"10px 0 0" }}>{data.module.title}</h1>
          <div style={{ marginTop:10, color:"#94a3b8" }}>
            Stage: {data.module.stage} · Status: {data.module.status} · Progress: {data.module.progress}% · Readiness: {data.module.readiness}%
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:16 }}>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Build</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.module.metrics.build}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Stability</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.module.metrics.stability}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Data</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.module.metrics.data}%</div></div>
          <div style={c}><div style={{ color:"#94a3b8", fontSize:12 }}>Automation</div><div style={{ fontSize:28, fontWeight:900, marginTop:6 }}>{data.module.metrics.automation}%</div></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr .95fr", gap:16 }}>
          <div style={c}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Description</div>
            <div style={b}>{data.module.description}</div>
          </div>

          <div style={c}>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Builder Info</div>
            <div style={{ display:"grid", gap:10 }}>
              <div style={b}>Slug: <b>{data.module.slug}</b></div>
              <div style={b}>Stage: <b>{data.module.stage}</b></div>
              <div style={b}>Status: <b>{data.module.status}</b></div>
              <div style={b}>Updated: <b>{new Date(data.module.updatedAt).toLocaleString()}</b></div>
            </div>
          </div>
        </div>

        <div style={c}>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:12 }}>Builder Navigation</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12 }}>
            {data.navigation.map((m) => (
              <a key={m.slug} href={m.href} style={{ ...b, textDecoration:"none", color:"white" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:900 }}>{m.title}</div>
                  <div style={{ color:"#22c55e", fontWeight:900 }}>{m.progress}%</div>
                </div>
                <div style={{ marginTop:6, color:"#94a3b8", fontSize:12 }}>{m.stage}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
`;

  const apiJs = `
import { NextResponse } from "next/server";
import { getModuleStatusBySlug } from "../../../../lib/tpm-runtime.js";

export async function GET() {
  const data = getModuleStatusBySlug("${slug}");
  if (!data) {
    return NextResponse.json({ ok: false, error: "module_not_found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
`;

  write(path.join(ROOT, "app", slug, "page.js"), pageJs);
  write(path.join(ROOT, "app", "api", slug, "status", "route.js"), apiJs);
}

console.log("TPM builder wrote", manifest.modules.length, "module pages and status APIs.");
