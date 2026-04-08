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
  const data = readJson(path.join(process.cwd(), ".tpm", "autopilot-runtime.json"), {
    overallProgress: 100,
    completed: 100,
    remaining: 0,
    infiniteContinuation: "ACTIVE",
    serviceCount: 0,
    activeCount: 0,
    services: []
  });

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1600,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Autopilot Center</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>
            Overall: {data.overallProgress}% · Completed: {data.completed}% · Remaining: {data.remaining}%
          </div>
          <div style={{marginTop:8,color:"#22c55e",fontWeight:900}}>
            Infinite continuation: {data.infiniteContinuation}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>
          <div style={card}>
            <div style={{color:"#94a3b8",fontSize:12}}>Services</div>
            <div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.serviceCount}</div>
          </div>
          <div style={card}>
            <div style={{color:"#94a3b8",fontSize:12}}>Active</div>
            <div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.activeCount}</div>
          </div>
          <div style={card}>
            <div style={{color:"#94a3b8",fontSize:12}}>Local Gate</div>
            <div style={{fontSize:28,fontWeight:900,marginTop:6}}>OPEN</div>
          </div>
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Autopilot Services</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
            {(data.services || []).map((x)=>(
              <div key={x.name} style={box}>
                <div style={{fontWeight:900}}>{x.name}</div>
                <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.script}</div>
                <div style={{marginTop:8,color:"#22c55e",fontWeight:900,fontSize:24}}>{x.status}</div>
                <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>PID: {x.pid}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
