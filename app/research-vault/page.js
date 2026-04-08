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
  const data = readJson(path.join(process.cwd(), ".tpm", "research-memory.json"), {
    filesTracked: 0, routes: 0, pages: 0, libs: 0, scripts: 0, watchedZones: [], latestSnapshots: []
  });

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1500,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Research Vault</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>Tracked files: {data.filesTracked}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:16}}>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Routes</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.routes}</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Pages</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.pages}</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Libs</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.libs}</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Scripts</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.scripts}</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Snapshots</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{(data.latestSnapshots||[]).length}</div></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={card}>
            <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Watched Zones</div>
            <div style={{display:"grid",gap:10}}>
              {(data.watchedZones || []).map((x,i)=><div key={i} style={box}>{x}</div>)}
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Latest Snapshots</div>
            <div style={{display:"grid",gap:10}}>
              {(data.latestSnapshots || []).map((x,i)=><div key={i} style={box}>{x}</div>)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
