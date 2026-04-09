import fs from "fs"; import path from "path";
export const dynamic = "force-dynamic";
const card={background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:20};
const box={background:"#020617",borderRadius:14,padding:14};
function R(f,b){ try{ return JSON.parse(fs.readFileSync(f,"utf8")); }catch{ return b; } }
export default function Page(){
  const data=R(path.join(process.cwd(),"data","helix","signal-parliament.json"),{chambers:[],metrics:{}});
  return <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",color:"white",padding:24,fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:1500,margin:"0 auto",display:"grid",gap:20}}><div style={card}><div style={{color:"#60a5fa",letterSpacing:4,fontSize:12}}>TRADING PRO MAX</div><h1 style={{fontSize:42,margin:"10px 0 0"}}>Signal Parliament</h1></div><div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:16}}>{(data.chambers||[]).map(x=><div key={x.slug} style={box}><div style={{fontWeight:900}}>{x.title}</div><div style={{marginTop:8,color:"#22c55e",fontWeight:900,fontSize:24}}>{x.progress}%</div><div style={{marginTop:6,color:"#94a3b8",fontSize:12}}>{x.status}</div></div>)}</div></div></main>;
}
