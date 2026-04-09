import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readJson(file, fallback){
  try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8")); }catch{}
  return fallback;
}

const card={background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:20};
const box={background:"#020617",borderRadius:14,padding:14};

export default function Page(){
  const runtime=readJson(path.join(process.cwd(),".tpm","autonomous-builder-runtime.json"),{overallProgress:0,managedModules:0,domains:{}});
  const manifest=readJson(path.join(process.cwd(),".tpm","autonomous-builder.manifest.json"),{modules:[]});

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1600,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Builder Control</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>Autonomous Builder: ACTIVE</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:16}}>
          <div style={box}><div style={{color:"#94a3b8",fontSize:12}}>overallProgress</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{runtime.overallProgress}%</div></div>
          <div style={box}><div style={{color:"#94a3b8",fontSize:12}}>managedModules</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{runtime.managedModules}</div></div>
          <div style={box}><div style={{color:"#94a3b8",fontSize:12}}>createdThisCycle</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{runtime.createdThisCycle}</div></div>
          <div style={box}><div style={{color:"#94a3b8",fontSize:12}}>mode</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{runtime.mode}</div></div>
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Manifest Modules</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
            {(manifest.modules || []).map((x)=>(<div key={x.slug} style={box}><div style={{fontWeight:900}}>{x.title}</div><div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.slug}</div></div>))}
          </div>
        </div>
      </div>
    </main>
  );
}
