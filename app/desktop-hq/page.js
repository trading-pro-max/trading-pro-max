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
  const data = readJson(path.join(process.cwd(), ".tpm", "expansion-runtime.json"), {
    domains: { desktop:88, notifications:90, packaging:92 }
  });

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1500,margin:"0 auto",display:"grid",gap:20}}>
        <div style={card}>
          <div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div>
          <h1 style={{fontSize:42,margin:"10px 0 0"}}>Desktop HQ</h1>
          <div style={{marginTop:10,color:"#94a3b8"}}>Desktop shell progress: {data.domains.desktop}%</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Desktop Runtime</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.desktop}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Notifications</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.notifications}%</div></div>
          <div style={card}><div style={{color:"#94a3b8",fontSize:12}}>Packaging</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{data.domains.packaging}%</div></div>
        </div>

        <div style={card}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Desktop Scope</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
            {["Window shell","Workspace panels","Market wall","Strategy wall","AI assist","Operator tray"].map((x)=><div key={x} style={box}>{x}</div>)}
          </div>
        </div>
      </div>
    </main>
  );
}
