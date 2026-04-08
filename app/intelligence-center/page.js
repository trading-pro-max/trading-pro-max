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
  const data = readJson(path.join(process.cwd(), ".tpm", "intelligence-runtime.json"), {
    overallProgress: 74,
    completed: 74,
    remaining: 26,
    domains: { brain:78, research:76, autonomy:94, surfaces:74, deployment:35, operations:83, expansion:32 },
    executionQueue: [],
    nextWave: []
  });

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1600,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Intelligence Center</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>Overall: {data.overallProgress}% · Completed: {data.completed}% · Remaining: {data.remaining}%</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:16}}>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Brain</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.brain}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Research</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.research}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Autonomy</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.autonomy}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Surfaces</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.surfaces}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Deployment</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.deployment}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Operations</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.operations}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Expansion</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.expansion}%</div></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16}}>
          <div style={card}>
            <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Execution Queue</div>
            <div style={{display:"grid",gap:10}}>
              {(data.executionQueue || []).map((x)=>(
                <div key={x.slug} style={box}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                    <div style={{fontWeight:900}}>{x.title}</div>
                    <div style={{color:"#22c55e",fontWeight:900}}>{x.progress}%</div>
                  </div>
                  <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.lane} · {x.priority} · {x.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Next Wave</div>
            <div style={{display:"grid",gap:10}}>
              {(data.nextWave || []).map((x)=>(
                <div key={x.slug} style={box}>
                  <div style={{fontWeight:900}}>{x.title}</div>
                  <div style={{marginTop:6,color:"#22c55e",fontWeight:900}}>{x.progress}%</div>
                  <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.lane} · {x.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
