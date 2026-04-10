import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Trading Pro Max — Product HQ",
  description: "Full local product surface for Trading Pro Max."
};

function readJson(file, fallback){
  try{
    if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  }catch{}
  return fallback;
}

const shell = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#020617 0%,#07111f 35%,#020617 100%)",
  color: "#fff",
  fontFamily: "Arial, sans-serif"
};

const wrap = {
  maxWidth: 1760,
  margin: "0 auto",
  padding: "20px 20px 40px"
};

const panel = {
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 22,
  boxShadow: "0 18px 50px rgba(0,0,0,0.30)"
};

const soft = { color: "#94a3b8" };
const green = { color: "#22c55e" };
const blue = { color: "#38bdf8" };
const amber = { color: "#f59e0b" };
const violet = { color: "#a78bfa" };

function StatCard({label,value,hint}){
  return (
    <div style={{...panel,padding:18}}>
      <div style={{fontSize:12,letterSpacing:1.5,textTransform:"uppercase",...soft}}>{label}</div>
      <div style={{fontSize:30,fontWeight:900,marginTop:8}}>{value}</div>
      <div style={{fontSize:12,marginTop:8,...soft}}>{hint}</div>
    </div>
  );
}

function ProgressBar({label,value,color}){
  return (
    <div style={{display:"grid",gap:8}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
        <div style={{fontWeight:800}}>{label}</div>
        <div style={{fontWeight:900,color}}>{value}%</div>
      </div>
      <div style={{height:10,borderRadius:999,background:"#0f172a",overflow:"hidden"}}>
        <div style={{width:`${value}%`,height:"100%",background:color,borderRadius:999}} />
      </div>
    </div>
  );
}

export default function Page(){
  const runtime = readJson(path.join(process.cwd(),".tpm","product-runtime.json"), {
    overallProgress: 0,
    metrics: {},
    modules: []
  });

  const data = readJson(path.join(process.cwd(),"data","product","runtime.json"), {
    suites: [],
    feed: [],
    routes: []
  });

  return (
    <main style={shell}>
      <div style={wrap}>
        <section style={{...panel,padding:24,marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:12,letterSpacing:4,textTransform:"uppercase",...blue,fontWeight:800}}>Trading Pro Max</div>
              <h1 style={{fontSize:44,margin:"8px 0 0"}}>Product HQ</h1>
              <div style={{marginTop:10,fontSize:16,color:"#cbd5e1",maxWidth:980}}>
                Full product workspace for market intelligence, strategy operations, execution control, AI assistance, risk protection, journaling, and desktop packaging.
              </div>
            </div>

            <div style={{minWidth:340,display:"grid",gap:8}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                <span style={soft}>Product completion</span>
                <strong style={green}>{runtime.overallProgress}%</strong>
              </div>
              <div style={{height:12,borderRadius:999,background:"#0f172a",overflow:"hidden"}}>
                <div style={{width:`${runtime.overallProgress}%`,height:"100%",background:"#22c55e",borderRadius:999}} />
              </div>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:12}}>
                <span style={soft}>Mode: {runtime.mode}</span>
                <span style={soft}>Gate: {runtime.releaseGate}</span>
              </div>
            </div>
          </div>
        </section>

        <section style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:14,marginBottom:18}}>
          <StatCard label="Product Progress" value={`${runtime.overallProgress}%`} hint="Whole product surface" />
          <StatCard label="Active Modules" value={runtime.metrics?.activeModules ?? 0} hint="Core modules online" />
          <StatCard label="Execution Routes" value={runtime.metrics?.executionRoutes ?? 0} hint="Decision routes" />
          <StatCard label="Signal Streams" value={runtime.metrics?.signalStreams ?? 0} hint="Active signal paths" />
          <StatCard label="AI Workflows" value={runtime.metrics?.aiWorkflows ?? 0} hint="Copilot flows" />
          <StatCard label="Risk Guards" value={runtime.metrics?.riskGuards ?? 0} hint="Protection layers" />
        </section>

        <section style={{display:"grid",gridTemplateColumns:"280px 1fr 380px",gap:16}}>
          <aside style={{...panel,padding:18,display:"grid",gap:16,alignSelf:"start"}}>
            <div>
              <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",...blue,fontWeight:800}}>Modules</div>
              <div style={{display:"grid",gap:10,marginTop:14}}>
                {(runtime.modules || []).map((x)=>(
                  <div key={x.slug} style={{padding:"12px 14px",borderRadius:14,background:"#020617",border:"1px solid rgba(148,163,184,0.12)"}}>
                    <div style={{fontWeight:800}}>{x.title}</div>
                    <div style={{display:"flex",justifyContent:"space-between",gap:10,marginTop:8}}>
                      <span style={soft}>{x.status}</span>
                      <strong style={x.tone === "watch" ? amber : green}>{x.progress}%</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",...amber,fontWeight:800}}>Progress Mesh</div>
              <div style={{display:"grid",gap:14,marginTop:14}}>
                {(runtime.modules || []).slice(0,5).map((x,idx)=>(
                  <ProgressBar
                    key={x.slug}
                    label={x.title}
                    value={x.progress}
                    color={idx % 3 === 0 ? "#22c55e" : idx % 3 === 1 ? "#38bdf8" : "#a78bfa"}
                  />
                ))}
              </div>
            </div>
          </aside>

          <div style={{display:"grid",gap:16}}>
            <section style={{...panel,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:14}}>
                <div>
                  <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",...blue,fontWeight:800}}>Core Suites</div>
                  <div style={{fontSize:26,fontWeight:900,marginTop:6}}>Product Surface</div>
                </div>
                <div style={{...soft,fontSize:13}}>Main working layers</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
                {(data.suites || []).map((suite)=>(
                  <div key={suite.title} style={{background:"#020617",borderRadius:18,padding:18,border:"1px solid rgba(148,163,184,0.10)"}}>
                    <div style={{fontSize:18,fontWeight:800}}>{suite.title}</div>
                    <div style={{display:"grid",gap:10,marginTop:14}}>
                      {(suite.items || []).map((item)=>(
                        <div key={item} style={{padding:"10px 12px",borderRadius:12,background:"rgba(15,23,42,0.88)",color:"#cbd5e1"}}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{...panel,padding:20}}>
                <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",...violet,fontWeight:800}}>Strategy Routes</div>
                <div style={{fontSize:24,fontWeight:900,marginTop:6,marginBottom:14}}>Execution Matrix</div>
                <div style={{display:"grid",gap:10}}>
                  {(data.routes || []).map((x)=>(
                    <div key={x.name} style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 90px 110px",gap:10,padding:"12px 14px",borderRadius:14,background:"#020617"}}>
                      <strong>{x.name}</strong>
                      <span style={soft}>{x.asset}</span>
                      <span style={green}>{x.confidence}</span>
                      <span style={blue}>{x.state}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{...panel,padding:20}}>
                <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",...green,fontWeight:800}}>Operator Feed</div>
                <div style={{fontSize:24,fontWeight:900,marginTop:6,marginBottom:14}}>Recent Product Events</div>
                <div style={{display:"grid",gap:10}}>
                  {(data.feed || []).map((x)=>(
                    <div key={x.time + x.text} style={{display:"grid",gridTemplateColumns:"72px 1fr",gap:10,padding:"12px 14px",borderRadius:14,background:"#020617"}}>
                      <strong style={blue}>{x.time}</strong>
                      <span style={{color:"#cbd5e1",lineHeight:1.6}}>{x.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside style={{...panel,padding:18,display:"grid",gap:16,alignSelf:"start"}}>
            <div>
              <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",...green,fontWeight:800}}>Execution Focus</div>
              <div style={{display:"grid",gap:10,marginTop:14}}>
                {[
                  "Product first",
                  "No website work",
                  "No public launch yet",
                  "Local product closure",
                  "Desktop packaging path"
                ].map((x)=>(
                  <div key={x} style={{padding:"12px 14px",borderRadius:14,background:"#020617",fontWeight:800}}>
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",...amber,fontWeight:800}}>Next Product Closure</div>
              <div style={{display:"grid",gap:10,marginTop:14}}>
                {[
                  "Deep workspace realism",
                  "Action flows and command sequencing",
                  "Journal and session memory layer",
                  "Desktop runtime packaging"
                ].map((x)=>(
                  <div key={x} style={{padding:"12px 14px",borderRadius:14,background:"#020617",lineHeight:1.6,color:"#cbd5e1"}}>
                    {x}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
