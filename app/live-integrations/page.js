import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readJson(file, fallback){
  try{
    if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8"));
  }catch{}
  return fallback;
}

const card = {background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:20};
const box = {background:"#020617",borderRadius:14,padding:14};

function tone(status){
  if(status === "connected" || status === "reachable") return "#22c55e";
  if(status === "not_configured") return "#f59e0b";
  return "#ef4444";
}

export default function Page(){
  const data = readJson(path.join(process.cwd(), ".tpm", "live-integrations-runtime.json"), {
    overallProgress:0,
    providers:{},
    summary:{ configuredCount:0, liveReadyCount:0, totalProviders:4 },
    actions:{}
  });

  const providers = Object.entries(data.providers || {});

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1600,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Live Integrations</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>Overall: {data.overallProgress}%</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Configured</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.summary?.configuredCount || 0}</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Live Ready</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.summary?.liveReadyCount || 0}</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Providers</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.summary?.totalProviders || 0}</div></div>
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Providers</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
            {providers.map(([k,v])=>(
              <div key={k} style={box}>
                <div style={{fontWeight:900,textTransform:"uppercase"}}>{k}</div>
                <div style={{marginTop:8,color:tone(v?.status),fontWeight:900,fontSize:24}}>{v?.status || "unknown"}</div>
                <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>
                  configured: {String(Boolean(v?.configured))} · ok: {String(Boolean(v?.ok))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Actions</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
            {Object.entries(data.actions || {}).map(([k,v])=>(
              <div key={k} style={box}>
                <div style={{color:"#94a3b8",fontSize:12}}>{k}</div>
                <div style={{fontSize:16,fontWeight:900,marginTop:6,wordBreak:"break-all"}}>{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
