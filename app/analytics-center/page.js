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

export default function Page(){
  const data = readJson(path.join(process.cwd(), ".tpm", "analytics-runtime.json"), {
    overallProgress: 94,
    completed: 94,
    remaining: 6,
    domains: { analytics:96, operator:94, client:93, notifications:92, memory:95 },
    metrics: { funnels:{ activation:91, retention:88, operatorEfficiency:93, commandCoverage:95 }, wall:{ activeCards:12, operatorQueues:4, priorityFeeds:7, researchStreams:5 } },
    nextWave: []
  });

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1600,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Analytics Center</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>Overall: {data.overallProgress}% · Completed: {data.completed}% · Remaining: {data.remaining}%</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:16}}>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Analytics</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.analytics}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Operator</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.operator}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Client</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.client}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Notifications</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.notifications}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Memory</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.memory}%</div></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={card}>
            <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Funnels</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
              {Object.entries(data.metrics.funnels || {}).map(([k,v])=><div key={k} style={box}><div style={{color:"#94a3b8",fontSize:12}}>{k}</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{v}%</div></div>)}
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Wall</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
              {Object.entries(data.metrics.wall || {}).map(([k,v])=><div key={k} style={box}><div style={{color:"#94a3b8",fontSize:12}}>{k}</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{v}</div></div>)}
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Next Wave</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
            {(data.nextWave || []).map((x)=>(
              <div key={x.slug} style={box}>
                <div style={{fontWeight:900}}>{x.title}</div>
                <div style={{marginTop:6,color:"#22c55e",fontWeight:900}}>{x.progress}%</div>
                <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
