export const metadata = {
  title: "Trading Pro Max — Intelligent Trading Platform",
  description: "Professional trading intelligence, execution clarity, legal-first trust, and platform-grade performance."
};

const shell = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, #0f172a 0%, #020617 45%, #000000 100%)",
  color: "#ffffff",
  fontFamily: "Arial, sans-serif"
};

const wrap = {
  maxWidth: 1360,
  margin: "0 auto",
  padding: "28px 20px 80px"
};

const card = {
  background: "rgba(15,23,42,0.78)",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)"
};

const soft = {
  color: "#94a3b8"
};

const features = [
  {
    title: "Command-Grade Market View",
    text: "A professional intelligence layer built to convert noise into structured, decision-ready market visibility."
  },
  {
    title: "Execution Clarity",
    text: "Clean decision flows, precise operating states, and reduced friction between analysis, validation, and action."
  },
  {
    title: "Legal-First Trust",
    text: "Built around lawful, professional, and risk-controlled operation standards instead of hype or unrealistic promises."
  },
  {
    title: "Resilience by Design",
    text: "Platform thinking across runtime continuity, monitoring, recovery discipline, and operational durability."
  }
];

const pillars = [
  "Intelligent platform architecture",
  "Professional-grade operator experience",
  "Risk-aware product direction",
  "Global brand-ready presentation",
  "Scalable website-to-platform path",
  "High-trust visual identity"
];

const stats = [
  { k: "Project State", v: "LIVE" },
  { k: "Readiness", v: "100%" },
  { k: "Operating Mode", v: "AUTONOMOUS" },
  { k: "Continuation", v: "INFINITY ACTIVE" }
];

export default function Page() {
  return (
    <main style={shell}>
      <div style={wrap}>
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:28}}>
          <div>
            <div style={{fontSize:12,letterSpacing:4,color:"#38bdf8",textTransform:"uppercase",fontWeight:700}}>Trading Pro Max</div>
            <div style={{fontSize:13,color:"#94a3b8",marginTop:6}}>Intelligent Trading Platform</div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <a href="#platform" style={{textDecoration:"none",padding:"10px 16px",borderRadius:999,border:"1px solid rgba(148,163,184,0.22)",color:"#fff",fontSize:14}}>Platform</a>
            <a href="#trust" style={{textDecoration:"none",padding:"10px 16px",borderRadius:999,border:"1px solid rgba(148,163,184,0.22)",color:"#fff",fontSize:14}}>Trust</a>
            <a href="#contact" style={{textDecoration:"none",padding:"10px 16px",borderRadius:999,background:"#22c55e",color:"#04130a",fontWeight:800,fontSize:14}}>Contact</a>
          </div>
        </header>

        <section style={{...card,padding:32,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1.2fr 0.8fr",gap:24,alignItems:"center"}}>
            <div>
              <div style={{display:"inline-block",padding:"8px 12px",borderRadius:999,background:"rgba(56,189,248,0.12)",border:"1px solid rgba(56,189,248,0.24)",color:"#7dd3fc",fontSize:12,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>
                Live Brand Surface
              </div>

              <h1 style={{fontSize:58,lineHeight:1.04,margin:"18px 0 14px",maxWidth:760}}>
                Build trading decisions on a sharper, cleaner, more professional intelligence surface.
              </h1>

              <p style={{fontSize:18,lineHeight:1.7,color:"#cbd5e1",maxWidth:760,margin:0}}>
                Trading Pro Max is being shaped as a serious platform experience: clearer market understanding, stronger operating confidence, disciplined execution thinking, and a trust-first product direction built for long-term scale.
              </p>

              <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:28}}>
                <a href="#platform" style={{textDecoration:"none",padding:"14px 20px",borderRadius:16,background:"#22c55e",color:"#04130a",fontWeight:800}}>
                  Explore Platform
                </a>
                <a href="#contact" style={{textDecoration:"none",padding:"14px 20px",borderRadius:16,border:"1px solid rgba(148,163,184,0.22)",color:"#fff",fontWeight:700}}>
                  Request Access
                </a>
              </div>
            </div>

            <div style={{display:"grid",gap:14}}>
              {stats.map((item) => (
                <div key={item.k} style={{...card,padding:18,background:"rgba(2,6,23,0.88)"}}>
                  <div style={{fontSize:12,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1.2}}>{item.k}</div>
                  <div style={{fontSize:30,fontWeight:900,marginTop:8}}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" style={{marginTop:24,display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:16}}>
          {features.map((item) => (
            <div key={item.title} style={{...card,padding:22}}>
              <div style={{width:42,height:42,borderRadius:14,background:"linear-gradient(135deg,#22c55e 0%,#38bdf8 100%)",marginBottom:16}} />
              <div style={{fontSize:20,fontWeight:800,marginBottom:10}}>{item.title}</div>
              <div style={{fontSize:15,lineHeight:1.7,color:"#cbd5e1"}}>{item.text}</div>
            </div>
          ))}
        </section>

        <section style={{marginTop:24,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{...card,padding:28}}>
            <div style={{fontSize:12,letterSpacing:2,color:"#38bdf8",textTransform:"uppercase",fontWeight:700}}>Platform Direction</div>
            <h2 style={{fontSize:34,margin:"14px 0 12px"}}>Designed as a platform, not just a page.</h2>
            <p style={{...soft,fontSize:16,lineHeight:1.8,margin:0}}>
              The objective is not a basic website. The objective is a platform-grade brand and operating layer that can grow into execution systems, intelligence modules, member workflows, research surfaces, and future expansion without breaking trust or clarity.
            </p>
          </div>

          <div style={{...card,padding:28}}>
            <div style={{fontSize:12,letterSpacing:2,color:"#22c55e",textTransform:"uppercase",fontWeight:700}}>Core Pillars</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:16}}>
              {pillars.map((item) => (
                <div key={item} style={{padding:"14px 16px",borderRadius:18,background:"rgba(2,6,23,0.88)",border:"1px solid rgba(148,163,184,0.14)",fontWeight:700}}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" style={{marginTop:24,display:"grid",gridTemplateColumns:"0.95fr 1.05fr",gap:16}}>
          <div style={{...card,padding:28}}>
            <div style={{fontSize:12,letterSpacing:2,color:"#f59e0b",textTransform:"uppercase",fontWeight:700}}>Trust Standard</div>
            <h2 style={{fontSize:32,margin:"14px 0 12px"}}>Professional. Lawful. Risk-controlled.</h2>
            <p style={{fontSize:16,lineHeight:1.85,color:"#cbd5e1",margin:0}}>
              Trading Pro Max is being positioned with a strict legal-first standard. The platform direction focuses on sustainable professionalism, controlled operations, and serious product credibility rather than exaggerated promises.
            </p>
          </div>

          <div style={{...card,padding:28}}>
            <div style={{fontSize:12,letterSpacing:2,color:"#a78bfa",textTransform:"uppercase",fontWeight:700}}>What This Signals</div>
            <div style={{display:"grid",gap:12,marginTop:16}}>
              {[
                "Clear operating posture for users and partners",
                "Higher trust brand presentation from day one",
                "Stronger fit for future serious product expansion",
                "Cleaner transition from website layer to full platform layer"
              ].map((item) => (
                <div key={item} style={{padding:"16px 18px",borderRadius:18,background:"rgba(2,6,23,0.88)",border:"1px solid rgba(148,163,184,0.14)",fontSize:16,fontWeight:700}}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" style={{...card,padding:30,marginTop:24}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,letterSpacing:2,color:"#38bdf8",textTransform:"uppercase",fontWeight:700}}>Next Move</div>
              <h2 style={{fontSize:34,margin:"12px 0 10px"}}>Trading Pro Max is live. The next layer is refinement and conversion power.</h2>
              <p style={{fontSize:16,lineHeight:1.8,color:"#cbd5e1",margin:0,maxWidth:820}}>
                The live surface is established. The next build wave focuses on stronger content, sharper conversion structure, higher-end sections, clearer positioning, and a more premium visual system.
              </p>
            </div>

            <a href="mailto:support@tradin-gpromax.com" style={{textDecoration:"none",padding:"16px 22px",borderRadius:18,background:"#22c55e",color:"#04130a",fontWeight:900,whiteSpace:"nowrap"}}>
              Contact Support
            </a>
          </div>
        </section>

        <footer style={{paddingTop:26,textAlign:"center",color:"#64748b",fontSize:13}}>
          © {new Date().getFullYear()} Trading Pro Max. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
