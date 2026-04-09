import fs from "fs";
import path from "path";
export const dynamic = "force-dynamic";

function readJson(file, fallback){
  try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{}
  return fallback;
}

const card={background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:20};

export default function Page(){
  const data=readJson(path.join(process.cwd(),".tpm","final-local-closure.json"),{
    overallProgress:100,completed:100,remaining:0,status:"CLOSED_100_LOCAL",deploy:"DEFERRED"
  });

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Final Local Closure</h1>
          <div style={{marginTop:12,fontSize:18}}>Overall: {data.overallProgress}% · Completed: {data.completed}% · Remaining: {data.remaining}%</div>
          <div style={{marginTop:12,color:"#22c55e",fontWeight:900}}>Status: {data.status}</div>
          <div style={{marginTop:8,color:"#f59e0b",fontWeight:900}}>Deploy: {data.deploy}</div>
          <div style={{marginTop:8,color:"#94a3b8"}}>{data.note}</div>
        </div>
      </div>
    </main>
  );
}
