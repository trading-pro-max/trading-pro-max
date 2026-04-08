import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readJson(file, fallback){
  try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")); }catch{}
  return fallback;
}

const card={background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:20};
const box={background:"#020617",borderRadius:14,padding:14};

export default function Page(){
  const runtime=readJson(path.join(process.cwd(),".tpm","sentinel-runtime.json"),{overallProgress:0,domains:{}});
  const data=readJson(path.join(process.cwd(),"data","sentinel","runtime.json"),{guards:[],metrics:{}});

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1600,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Sentinel Core</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>Overall: {runtime.overallProgress}%</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:16}}>
          {Object.entries(runtime.domains || {}).map(([k,v])=>(
            <div key={k} style={card}>
              <div style={{color:"#94a3b8",fontSize:12}}>{k}</div>
              <div style={{fontSize:28,fontWeight:900,marginTop:6}}>{v}%</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Guards</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
            {(data.guards || []).map((x)=>(
              <div key={x.slug} style={box}>
                <div style={{fontWeight:900}}>{x.title}</div>
                <div style={{marginTop:8,color:"#22c55e",fontWeight:900,fontSize:24}}>{x.strength}%</div>
                <div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Metrics</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
            {Object.entries(data.metrics || {}).map(([k,v])=>(
              <div key={k} style={box}>
                <div style={{color:"#94a3b8",fontSize:12}}>{k}</div>
                <div style={{fontSize:28,fontWeight:900,marginTop:6}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
