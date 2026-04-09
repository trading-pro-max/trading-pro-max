import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readJson(file, fallback){
  try{
    if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8"));
  }catch{}
  return fallback;
}

const card={background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:20};
const box={background:"#020617",borderRadius:14,padding:14};

export default function Page(){
  const runtime = readJson(path.join(process.cwd(),".tpm","active-runtime.json"), {
    overallProgress:100, completed:100, remaining:0, infiniteContinuation:"ACTIVE", counts:{modules:0,pages:0,apiRoutes:0,loops:0,stores:0}, modules:[]
  });
  const mega = readJson(path.join(process.cwd(),"data","active","mega.json"), {
    counts:{modules:0,pages:0,apiRoutes:0,loops:0,stores:0},
    controls:{localCertified:true,releaseGate:"OPEN_LOCAL",infiniteContinuation:"ACTIVE",externalDeployBlocked:true},
    stacks:{topModules:[]}
  });

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1700,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:44,margin:"10px 0 0"}}>Active Center</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>
            Overall: {runtime.overallProgress}% · Completed: {runtime.completed}% · Remaining: {runtime.remaining}% · Infinite Continuation: {runtime.infiniteContinuation}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:16}}>
          {Object.entries(mega.counts || {}).map(([k,v])=>(
            <div key={k} style={card}>
              <div style={{color:"#94a3b8",fontSize:12}}>{k}</div>
              <div style={{fontSize:30,fontWeight:900,marginTop:6}}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16}}>
          <div style={card}>
            <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Top Modules</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
              {(runtime.topStack || runtime.modules || []).slice(0,12).map((x)=>(
                <div key={x.slug} style={box}>
                  <div style={{fontWeight:900}}>{x.title}</div>
                  <div style={{marginTop:8,fontSize:24,fontWeight:900,color:"#22c55e"}}>{x.progress}%</div>
                  <div style={{marginTop:6,fontSize:12,color:"#94a3b8"}}>{x.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Controls</div>
            <div style={{display:"grid",gap:10}}>
              {Object.entries(mega.controls || {}).map(([k,v])=>(
                <div key={k} style={box}>
                  <div style={{color:"#94a3b8",fontSize:12}}>{k}</div>
                  <div style={{fontSize:24,fontWeight:900,marginTop:6}}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
