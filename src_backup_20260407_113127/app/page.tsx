export default function Home() {
  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",display:"flex",justifyContent:"center",alignItems:"center",padding:24,fontFamily:"Arial"}}>
      <div style={{maxWidth:1200,width:"100%",display:"grid",gridTemplateColumns:"1.2fr 0.8fr",gap:24}}>
        <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:24,padding:28,color:"white"}}>
          <div style={{fontSize:12,letterSpacing:3,color:"#60a5fa",textTransform:"uppercase"}}>Trading Pro Max</div>
          <h1 style={{fontSize:52,margin:"12px 0 10px"}}>Private AI Command Ecosystem</h1>
          <p style={{color:"#94a3b8",fontSize:18,lineHeight:1.7}}>Central terminal, AI dashboard, command center, private desktop console, and private mobile control layer.</p>
          <div style={{display:"flex",gap:14,marginTop:24,flexWrap:"wrap"}}>
            <a href="/control" style={{padding:"16px 28px",borderRadius:14,background:"#22c55e",color:"white",fontWeight:800,textDecoration:"none"}}>Open AI Control Center</a>
            <a href="/desktop-private" style={{padding:"16px 28px",borderRadius:14,border:"1px solid #334155",background:"#0b1220",color:"white",fontWeight:800,textDecoration:"none"}}>Desktop Private</a>
            <a href="/mobile-private" style={{padding:"16px 28px",borderRadius:14,border:"1px solid #334155",background:"#0b1220",color:"white",fontWeight:800,textDecoration:"none"}}>Mobile Private</a>
          </div>
        </div>

        <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:24,padding:28,color:"white"}}>
          <div style={{fontSize:14,color:"#9ca3af",fontWeight:700}}>Upgrade Path</div>
          <div style={{marginTop:18,display:"grid",gap:14}}>
            {[
              ["Central Terminal", "DONE"],
              ["AI Dashboard", "DONE"],
              ["Command Center", "DONE"],
              ["Desktop Private", "READY"],
              ["Mobile Private", "READY"]
            ].map(([a,b]) => (
              <div key={a} style={{background:"#0b1220",borderRadius:16,padding:16}}>
                <div style={{color:"#94a3b8",fontSize:12}}>{a}</div>
                <div style={{fontSize:22,fontWeight:900,marginTop:8}}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
