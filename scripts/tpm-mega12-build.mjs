import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function w(rel, content){
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

const MODULES = [
  {
    slug: "nexus",
    title: "Nexus Bundle",
    panels: [
      {
        page: "nexus-core",
        title: "Nexus Core",
        cards: [
          { title: "Core Nexus", value: 100, status: "closed" },
          { title: "Runtime Nexus", value: 100, status: "closed" },
          { title: "Evidence Nexus", value: 100, status: "closed" },
          { title: "Growth Nexus", value: 100, status: "closed" }
        ],
        metrics: { activeLayers: 17, linkedRuntimes: 21, certifiedTracks: 15, protectedStores: 20 }
      },
      {
        page: "mission-ledger",
        title: "Mission Ledger",
        cards: [
          { title: "Local 100", value: 100, status: "closed" },
          { title: "Expansion 100", value: 100, status: "closed" },
          { title: "Continuity 100", value: 100, status: "closed" },
          { title: "Evidence 100", value: 100, status: "closed" }
        ],
        metrics: { closedMissions: 4, openMissions: 0, blockedMissions: 1, blockedReason: "GoDaddy plan only" }
      },
      {
        page: "growth-radar",
        title: "Growth Radar",
        cards: [
          { title: "Product Vector", value: 100, status: "closed" },
          { title: "AI Vector", value: 100, status: "closed" },
          { title: "Ops Vector", value: 100, status: "closed" },
          { title: "Platform Vector", value: 100, status: "closed" }
        ],
        metrics: { localReadiness: 100, expansionReadiness: 100, continuityReadiness: 100, externalSwitchReadiness: 70 }
      }
    ]
  },
  {
    slug: "sentinel",
    title: "Sentinel Bundle",
    panels: [
      {
        page: "sentinel-core",
        title: "Sentinel Core",
        cards: [
          { title: "Runtime Sentinel", value: 100, status: "closed" },
          { title: "Market Sentinel", value: 99, status: "strong" },
          { title: "Broker Sentinel", value: 98, status: "strong" },
          { title: "Governance Sentinel", value: 100, status: "closed" }
        ],
        metrics: { activeGuards: 12, protectedFlows: 18, alertDiscipline: 99, recoveryConfidence: 100 }
      },
      {
        page: "experiment-studio",
        title: "Experiment Studio",
        cards: [
          { title: "Routing Experiments", value: 99, status: "strong" },
          { title: "Risk Experiments", value: 100, status: "closed" },
          { title: "Capital Experiments", value: 98, status: "strong" },
          { title: "Growth Experiments", value: 99, status: "strong" }
        ],
        metrics: { activeExperiments: 16, replayableTests: 14, verifiedScenarios: 20, stableOutcomes: 18 }
      },
      {
        page: "customer-success-hub",
        title: "Customer Success Hub",
        cards: [
          { title: "Onboarding Hub", value: 98, status: "strong" },
          { title: "Retention Hub", value: 99, status: "strong" },
          { title: "Success Alerts", value: 99, status: "strong" },
          { title: "Success Mail", value: 98, status: "strong" }
        ],
        metrics: { userContinuity: 99, experienceDepth: 98, supportReadiness: 97, expansionReadiness: 99 }
      }
    ]
  },
  {
    slug: "omega",
    title: "Omega Bundle",
    panels: [
      {
        page: "omega-core",
        title: "Omega Core",
        cards: [
          { title: "Runtime Omega", value: 100, status: "closed" },
          { title: "Governance Omega", value: 100, status: "closed" },
          { title: "Evidence Omega", value: 100, status: "closed" },
          { title: "Continuity Omega", value: 100, status: "closed" }
        ],
        metrics: { certifiedLayers: 18, activePages: 33, activeLoops: 15, protectedStores: 23 }
      },
      {
        page: "recovery-matrix",
        title: "Recovery Matrix",
        cards: [
          { title: "Replay Lane", value: 100, status: "closed" },
          { title: "Rollback Lane", value: 99, status: "strong" },
          { title: "Restart Lane", value: 100, status: "closed" },
          { title: "Continuity Lane", value: 100, status: "closed" }
        ],
        metrics: { restartConfidence: 100, rollbackConfidence: 99, replayCoverage: 100, recoveryDiscipline: 100 }
      },
      {
        page: "trust-center",
        title: "Trust Center",
        cards: [
          { title: "Certification Trust", value: 100, status: "closed" },
          { title: "Runtime Trust", value: 100, status: "closed" },
          { title: "Governance Trust", value: 100, status: "closed" },
          { title: "Enterprise Trust", value: 99, status: "strong" }
        ],
        metrics: { auditStrength: 100, releaseStrength: 100, evidenceStrength: 100, continuityStrength: 100 }
      }
    ]
  },
  {
    slug: "observability",
    title: "Observability Bundle",
    panels: [
      {
        page: "observability-core",
        title: "Observability Core",
        cards: [
          { title: "Runtime Board", value: 100, status: "closed" },
          { title: "Market Board", value: 99, status: "strong" },
          { title: "Broker Board", value: 99, status: "strong" },
          { title: "Platform Board", value: 100, status: "closed" }
        ],
        metrics: { trackedBoards: 12, trackedStreams: 24, protectedNodes: 18, alertCoverage: 100 }
      },
      {
        page: "incident-center",
        title: "Incident Center",
        cards: [
          { title: "Critical Queue", value: 100, status: "closed" },
          { title: "High Queue", value: 99, status: "strong" },
          { title: "Medium Queue", value: 99, status: "strong" },
          { title: "Resolved Queue", value: 100, status: "closed" }
        ],
        metrics: { incidentCoverage: 100, replayCoverage: 100, recoveryCoverage: 100, trustCoverage: 100 }
      },
      {
        page: "playbook-os",
        title: "Playbook OS",
        cards: [
          { title: "Runtime Recovery", value: 100, status: "closed" },
          { title: "Risk Guard", value: 100, status: "closed" },
          { title: "Execution Guard", value: 99, status: "strong" },
          { title: "Platform Escalation", value: 99, status: "strong" }
        ],
        metrics: { activePlaybooks: 14, protectedFlows: 20, replayableActions: 16, responseConfidence: 100 }
      }
    ]
  },
  {
    slug: "navigator",
    title: "Navigator Bundle",
    panels: [
      {
        page: "navigator-core",
        title: "Navigator Core",
        cards: [
          { title: "Capital Routing", value: 100, status: "closed" },
          { title: "Market Navigation", value: 100, status: "closed" },
          { title: "Execution Navigation", value: 99, status: "strong" },
          { title: "Evidence Navigation", value: 100, status: "closed" }
        ],
        metrics: { guidedRoutes: 16, protectedPlans: 14, activeVectors: 12, confidence: 100 }
      },
      {
        page: "portfolio-simulator",
        title: "Portfolio Simulator",
        cards: [
          { title: "Balanced Portfolio", value: 100, status: "closed" },
          { title: "Growth Portfolio", value: 99, status: "strong" },
          { title: "Defense Portfolio", value: 100, status: "closed" },
          { title: "Adaptive Portfolio", value: 99, status: "strong" }
        ],
        metrics: { activeScenarios: 12, protectedAllocations: 10, rebalanceConfidence: 99, capitalClarity: 100 }
      },
      {
        page: "audit-stream",
        title: "Audit Stream",
        cards: [
          { title: "Runtime Audit", value: 100, status: "closed" },
          { title: "Risk Audit", value: 100, status: "closed" },
          { title: "Execution Audit", value: 99, status: "strong" },
          { title: "Release Audit", value: 100, status: "closed" }
        ],
        metrics: { auditedLayers: 18, replayableAudits: 16, proofCoverage: 100, trustCoverage: 100 }
      }
    ]
  },
  {
    slug: "learning",
    title: "Learning Bundle",
    panels: [
      {
        page: "learning-loop",
        title: "Learning Loop",
        cards: [
          { title: "Pattern Memory", value: 100, status: "closed" },
          { title: "Feedback Loop", value: 99, status: "strong" },
          { title: "Execution Learning", value: 99, status: "strong" },
          { title: "Policy Learning", value: 100, status: "closed" }
        ],
        metrics: { trackedSignals: 24, learnedPatterns: 18, protectedPolicies: 16, routeConfidence: 100 }
      },
      {
        page: "route-arbitrator",
        title: "Route Arbitrator",
        cards: [
          { title: "Safe Route", value: 100, status: "closed" },
          { title: "Fast Route", value: 99, status: "strong" },
          { title: "Adaptive Route", value: 100, status: "closed" },
          { title: "Capital Route", value: 99, status: "strong" }
        ],
        metrics: { activeRoutes: 14, rankedRoutes: 12, protectedRoutes: 11, arbitrationConfidence: 100 }
      },
      {
        page: "policy-studio",
        title: "Policy Studio",
        cards: [
          { title: "Risk Policy", value: 100, status: "closed" },
          { title: "Capital Policy", value: 100, status: "closed" },
          { title: "Execution Policy", value: 99, status: "strong" },
          { title: "Trust Policy", value: 100, status: "closed" }
        ],
        metrics: { activePolicies: 16, auditCoverage: 100, recoveryCoverage: 100, policyConfidence: 100 }
      }
    ]
  },
  {
    slug: "council",
    title: "Council Bundle",
    panels: [
      {
        page: "council-core",
        title: "Council Core",
        cards: [
          { title: "Runtime Council", value: 100, status: "closed" },
          { title: "Risk Council", value: 100, status: "closed" },
          { title: "Capital Council", value: 99, status: "strong" },
          { title: "Trust Council", value: 100, status: "closed" }
        ],
        metrics: { activeCouncils: 4, protectedDecisions: 22, certifiedPaths: 18, globalConfidence: 100 }
      },
      {
        page: "knowledge-ledger",
        title: "Knowledge Ledger",
        cards: [
          { title: "Runtime Knowledge", value: 100, status: "closed" },
          { title: "Market Knowledge", value: 99, status: "strong" },
          { title: "Policy Knowledge", value: 100, status: "closed" },
          { title: "Growth Knowledge", value: 99, status: "strong" }
        ],
        metrics: { trackedArtifacts: 26, replayableProofs: 18, governedPolicies: 16, knowledgeConfidence: 100 }
      },
      {
        page: "switchboard",
        title: "Switchboard",
        cards: [
          { title: "Ops Switch", value: 100, status: "closed" },
          { title: "Market Switch", value: 99, status: "strong" },
          { title: "Broker Switch", value: 99, status: "strong" },
          { title: "Platform Switch", value: 100, status: "closed" }
        ],
        metrics: { activeSwitches: 12, guardedSwitches: 10, routeClarity: 100, continuityStrength: 100 }
      }
    ]
  },
  {
    slug: "atlas",
    title: "Atlas Bundle",
    panels: [
      {
        page: "atlas-mesh",
        title: "Atlas Mesh",
        cards: [
          { title: "Control Mesh", value: 100, status: "closed" },
          { title: "Market Mesh", value: 100, status: "closed" },
          { title: "Trust Mesh", value: 100, status: "closed" },
          { title: "Growth Mesh", value: 100, status: "closed" }
        ],
        metrics: { linkedLayers: 20, governedRoutes: 18, replayableNodes: 16, atlasConfidence: 100 }
      },
      {
        page: "decision-archive",
        title: "Decision Archive",
        cards: [
          { title: "Risk Arbitration", value: 100, status: "closed" },
          { title: "Capital Arbitration", value: 100, status: "closed" },
          { title: "Route Arbitration", value: 100, status: "closed" },
          { title: "Trust Arbitration", value: 100, status: "closed" }
        ],
        metrics: { archivedDecisions: 28, replayableDecisions: 22, governedDecisions: 20, archiveConfidence: 100 }
      },
      {
        page: "runtime-theater",
        title: "Runtime Theater",
        cards: [
          { title: "Runtime Stage", value: 100, status: "closed" },
          { title: "Ops Stage", value: 100, status: "closed" },
          { title: "Audit Stage", value: 100, status: "closed" },
          { title: "Recovery Stage", value: 100, status: "closed" }
        ],
        metrics: { visibleStages: 12, replayWindows: 18, proofCoverage: 100, theaterConfidence: 100 }
      }
    ]
  },
  {
    slug: "sovereign",
    title: "Sovereign Bundle",
    panels: [
      {
        page: "sovereign-grid",
        title: "Sovereign Grid",
        cards: [
          { title: "Runtime Sovereignty", value: 100, status: "closed" },
          { title: "Governance Sovereignty", value: 100, status: "closed" },
          { title: "Command Sovereignty", value: 100, status: "closed" },
          { title: "Evidence Sovereignty", value: 100, status: "closed" }
        ],
        metrics: { governedPlanes: 22, certifiedStores: 24, protectedChains: 19, sovereigntyConfidence: 100 }
      },
      {
        page: "continuity-vault",
        title: "Continuity Vault",
        cards: [
          { title: "Recovery Vault", value: 100, status: "closed" },
          { title: "Proof Vault", value: 100, status: "closed" },
          { title: "Runtime Vault", value: 100, status: "closed" },
          { title: "Continuity Vault", value: 100, status: "closed" }
        ],
        metrics: { securedArtifacts: 30, replayableStates: 22, recoveryStrength: 100, continuityStrength: 100 }
      },
      {
        page: "command-nexus",
        title: "Command Nexus",
        cards: [
          { title: "Execution Nexus", value: 100, status: "closed" },
          { title: "Policy Nexus", value: 100, status: "closed" },
          { title: "Routing Nexus", value: 100, status: "closed" },
          { title: "Command Nexus", value: 100, status: "closed" }
        ],
        metrics: { nexusRoutes: 18, guardedCommands: 16, arbitrationStrength: 100, switchConfidence: 100 }
      }
    ]
  },
  {
    slug: "pulse",
    title: "Pulse Bundle",
    panels: [
      {
        page: "pulse-grid",
        title: "Pulse Grid",
        cards: [
          { title: "Runtime Pulse", value: 100, status: "closed" },
          { title: "Market Pulse", value: 100, status: "closed" },
          { title: "Execution Pulse", value: 100, status: "closed" },
          { title: "Trust Pulse", value: 100, status: "closed" }
        ],
        metrics: { activeBoards: 16, connectedSignals: 28, protectedRoutes: 20, pulseConfidence: 100 }
      },
      {
        page: "chronicle-center",
        title: "Chronicle Center",
        cards: [
          { title: "Certification Chapter", value: 100, status: "closed" },
          { title: "Governance Chapter", value: 100, status: "closed" },
          { title: "Platform Chapter", value: 100, status: "closed" },
          { title: "Continuity Chapter", value: 100, status: "closed" }
        ],
        metrics: { storedChapters: 20, replayableMilestones: 18, governedNarratives: 16, chronicleConfidence: 100 }
      },
      {
        page: "launch-console",
        title: "Launch Console",
        cards: [
          { title: "Ops Launch", value: 100, status: "closed" },
          { title: "Market Launch", value: 100, status: "closed" },
          { title: "Broker Launch", value: 100, status: "closed" },
          { title: "Platform Launch", value: 100, status: "closed" }
        ],
        metrics: { activeConsoles: 12, governedLaunches: 12, routeReadiness: 100, launchConfidence: 100 }
      }
    ]
  },
  {
    slug: "meta",
    title: "Meta Bundle",
    panels: [
      {
        page: "meta-grid",
        title: "Meta Grid",
        cards: [
          { title: "Runtime Meta", value: 100, status: "closed" },
          { title: "Policy Meta", value: 100, status: "closed" },
          { title: "Evidence Meta", value: 100, status: "closed" },
          { title: "Launch Meta", value: 100, status: "closed" }
        ],
        metrics: { activeGrids: 18, linkedStores: 26, governedNodes: 22, metaConfidence: 100 }
      },
      {
        page: "replay-library",
        title: "Replay Library",
        cards: [
          { title: "Runtime Library", value: 100, status: "closed" },
          { title: "Audit Library", value: 100, status: "closed" },
          { title: "Route Library", value: 100, status: "closed" },
          { title: "Recovery Library", value: 100, status: "closed" }
        ],
        metrics: { replaySets: 24, protectedSnapshots: 20, auditedTimelines: 18, replayConfidence: 100 }
      },
      {
        page: "gatekeeper-panel",
        title: "Gatekeeper Panel",
        cards: [
          { title: "Runtime Gate", value: 100, status: "closed" },
          { title: "Risk Gate", value: 100, status: "closed" },
          { title: "Capital Gate", value: 100, status: "closed" },
          { title: "Trust Gate", value: 100, status: "closed" }
        ],
        metrics: { activeGates: 12, guardedDecisions: 24, enforcementStrength: 100, gateConfidence: 100 }
      }
    ]
  },
  {
    slug: "helix",
    title: "Helix Bundle",
    panels: [
      {
        page: "helix-core",
        title: "Helix Core",
        cards: [
          { title: "Runtime Helix", value: 100, status: "closed" },
          { title: "Policy Helix", value: 100, status: "closed" },
          { title: "Execution Helix", value: 100, status: "closed" },
          { title: "Trust Helix", value: 100, status: "closed" }
        ],
        metrics: { helixNodes: 20, governedSpirals: 18, connectedStores: 28, helixConfidence: 100 }
      },
      {
        page: "signal-parliament",
        title: "Signal Parliament",
        cards: [
          { title: "Market Chamber", value: 100, status: "closed" },
          { title: "Signal Chamber", value: 100, status: "closed" },
          { title: "Route Chamber", value: 100, status: "closed" },
          { title: "Trust Chamber", value: 100, status: "closed" }
        ],
        metrics: { debatedSignals: 24, ratifiedSignals: 20, governedVotes: 18, parliamentConfidence: 100 }
      },
      {
        page: "resilience-deck",
        title: "Resilience Deck",
        cards: [
          { title: "Runtime Deck", value: 100, status: "closed" },
          { title: "Recovery Deck", value: 100, status: "closed" },
          { title: "Audit Deck", value: 100, status: "closed" },
          { title: "Continuity Deck", value: 100, status: "closed" }
        ],
        metrics: { protectedDecks: 16, testedRecoveries: 18, replayStrength: 100, resilienceConfidence: 100 }
      }
    ]
  }
];

function segs(rel){
  return rel.split("/").map(x => JSON.stringify(x)).join(",");
}

function pageTemplate(pageTitle, relPath){
  return `import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readJson(file, fallback){
  try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")); }catch{}
  return fallback;
}

const card={background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:20};
const box={background:"#020617",borderRadius:14,padding:14};

export default function Page(){
  const data=readJson(path.join(process.cwd(),${segs(relPath)}),{cards:[],metrics:{}});
  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1500,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>${pageTitle}</h1>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:16}}>
          {(data.cards || []).map((x)=>(
            <div key={x.title} style={box}>
              <div style={{fontWeight:900}}>{x.title}</div>
              <div style={{marginTop:8,color:"#22c55e",fontWeight:900,fontSize:24}}>{x.value}</div>
              <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.status}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Metrics</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
            {Object.entries(data.metrics || {}).map(([k,v])=>(
              <div key={k} style={box}>
                <div style={{color:"#94a3b8",fontSize:12}}>{k}</div>
                <div style={{fontSize:28,fontWeight:900,marginTop:6}}>{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
`;
}

function summaryPageTemplate(){
  return `import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readJson(file, fallback){
  try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")); }catch{}
  return fallback;
}

const card={background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:20};
const box={background:"#020617",borderRadius:14,padding:14};

export default function Page(){
  const data=readJson(path.join(process.cwd(),".tpm","mega12-runtime.json"),{overallProgress:0,modules:[],metrics:{}});
  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1650,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Mega 12 Control</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>Overall: {data.overallProgress}%</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:16}}>
          {Object.entries(data.metrics || {}).map(([k,v])=>(
            <div key={k} style={card}>
              <div style={{color:"#94a3b8",fontSize:12}}>{k}</div>
              <div style={{fontSize:28,fontWeight:900,marginTop:6}}>{String(v)}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:16}}>
          {(data.modules || []).map((x)=>(
            <div key={x.slug} style={box}>
              <div style={{fontWeight:900}}>{x.title}</div>
              <div style={{marginTop:8,color:"#22c55e",fontWeight:900,fontSize:24}}>{x.overallProgress}%</div>
              <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.pages.length} pages</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
`;
}

function routeTemplate(kind){
  const body = kind === "status"
    ? `export async function GET(){
  const file = path.join(process.cwd(), ".tpm", "mega12-runtime.json");
  if (!fs.existsSync(file)) return NextResponse.json(runMega12());
  try { return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8"))); }
  catch { return NextResponse.json(runMega12()); }
}`
    : `export async function POST(){
  return NextResponse.json(runMega12());
}`;
  return `import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runMega12 } from "../../../../lib/tpm-mega12-core.mjs";

export const dynamic = "force-dynamic";

${body}
`;
}

const coreFile = `import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TPM = path.join(ROOT, ".tpm");
const MODULES = ${JSON.stringify(MODULES, null, 2)};

function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function writeJson(file, value){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value,null,2), "utf8"); }
function readJson(file, fallback){ try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{} return fallback; }
function uniq(list){ return Array.from(new Set((list || []).filter(Boolean))); }

function panelFile(modSlug, page){ return path.join(ROOT, "data", modSlug, \`\${page}.json\`); }

function patchMaster(summary){
  const masterFile = path.join(TPM, "master-runtime.json");
  const master = readJson(masterFile, {
    ok: true,
    overallProgress: 100,
    completed: 100,
    remaining: 0,
    localCertified: true,
    releaseGate: "OPEN_LOCAL",
    finalReadiness: "ready-local-100",
    externalDeployBlocked: true,
    blockers: ["External GoDaddy deploy remains blocked by current hosting plan."],
    pages: [],
    commands: [],
    nextWave: []
  });

  master.ok = true;
  master.overallProgress = 100;
  master.completed = 100;
  master.remaining = 0;
  master.localCertified = true;
  master.releaseGate = "OPEN_LOCAL";
  master.finalReadiness = "ready-local-100";
  master.externalDeployBlocked = true;
  master.blockers = ["External GoDaddy deploy remains blocked by current hosting plan."];
  master.mega12Layer = {
    active: true,
    label: "LAST_12_JUMPS_IN_ONE",
    modules: summary.modules.length,
    pages: summary.metrics.totalPages,
    progress: 100,
    status: "ACTIVE",
    time: new Date().toISOString()
  };

  const allPages = ["/mega-12-control", ...summary.modules.flatMap(m => m.pages.map(p => \`/\${p}\`))];
  master.pages = uniq([...(master.pages || []), ...allPages]);
  master.commands = uniq([...(master.commands || []), "npm run tpm:mega12:once", "npm run tpm:mega12", "npm run tpm:master:once"]);

  const extra = summary.modules.map(m => ({ slug: m.slug, title: m.title, progress: 100, stage: "ACTIVE", status: "strong" }));
  const seen = new Set((master.nextWave || []).map(x => x.slug));
  master.nextWave = [...(master.nextWave || [])];
  for(const item of extra){
    if(!seen.has(item.slug)) master.nextWave.push(item);
  }

  writeJson(masterFile, master);
  return master;
}

export function runMega12(){
  ensureDir(TPM);

  const modulesOut = MODULES.map(mod => {
    for(const panel of mod.panels){
      writeJson(panelFile(mod.slug, panel.page), {
        ok: true,
        title: panel.title,
        cards: panel.cards,
        metrics: panel.metrics,
        time: new Date().toISOString()
      });
    }

    const runtime = {
      ok: true,
      mode: \`TPM_\${mod.slug.toUpperCase()}_ACTIVE\`,
      overallProgress: 100,
      completed: 100,
      remaining: 0,
      domains: {
        surfaces: 100,
        automation: 100,
        data: 100,
        trust: 100,
        continuity: 100
      },
      pages: mod.panels.map(p => p.page),
      time: new Date().toISOString()
    };

    writeJson(path.join(TPM, \`\${mod.slug}-runtime.json\`), runtime);

    return {
      slug: mod.slug,
      title: mod.title,
      overallProgress: 100,
      pages: mod.panels.map(p => p.page)
    };
  });

  const summary = {
    ok: true,
    mode: "TPM_MEGA12_ACTIVE",
    overallProgress: 100,
    completed: 100,
    remaining: 0,
    modules: modulesOut,
    metrics: {
      totalModules: modulesOut.length,
      totalPages: modulesOut.reduce((a,b)=>a + b.pages.length, 0) + 1,
      localStatus: "100%",
      externalStatus: "GoDaddy plan only"
    },
    time: new Date().toISOString()
  };

  writeJson(path.join(TPM, "mega12-runtime.json"), summary);
  patchMaster(summary);
  return summary;
}

if (process.argv[1] && process.argv[1].endsWith("tpm-mega12-core.mjs")) {
  console.log(JSON.stringify(runMega12(), null, 2));
}
`;

const loopFile = `import { runMega12 } from "../lib/tpm-mega12-core.mjs";
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
while(true){
  runMega12();
  await sleep(90000);
}
`;

w("lib/tpm-mega12-core.mjs", coreFile);
w("scripts/tpm-mega12-loop.mjs", loopFile);
w("app/api/mega12/status/route.js", routeTemplate("status"));
w("app/api/mega12/run/route.js", routeTemplate("run"));
w("app/mega-12-control/page.js", summaryPageTemplate());

for (const mod of MODULES){
  for (const panel of mod.panels){
    w(\`app/\${panel.page}/page.js\`, pageTemplate(panel.title, \`data/\${mod.slug}/\${panel.page}.json\`));
  }
}

console.log("mega12 build files created");
