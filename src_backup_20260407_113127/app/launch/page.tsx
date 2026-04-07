"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LaunchPage() {
  const search = useSearchParams();
  const ref = search.get("ref") || "";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [referralLink, setReferralLink] = useState("");

  const joinWaitlist = async () => {
    setStatus("Joining...");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "launch", referralCode: ref || undefined }),
    });
    const data = await res.json();
    if (!data?.ok) {
      setStatus(data?.error || "Failed");
      return;
    }

    const refRes = await fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const refData = await refRes.json();

    setReferralLink(refData?.link || "");
    setStatus("Success");
  };

  const sendMessage = async () => {
    setStatus("Sending...");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });
    const data = await res.json();
    setStatus(data?.ok ? "Message sent" : data?.error || "Failed");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
    marginTop: 12,
  };

  return (
    <main style={{
      minHeight:"100vh",
      background:"linear-gradient(180deg,#020617 0%,#0b1120 100%)",
      color:"white",
      fontFamily:"Arial",
      padding:"40px 20px"
    }}>
      <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gap:24}}>
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:12,letterSpacing:3,color:"#60a5fa",textTransform:"uppercase"}}>Trading Pro Max</div>
          <h1 style={{fontSize:54,margin:"10px 0 12px",fontWeight:900}}>AI Trading Platform Built To Scale</h1>
          <p style={{color:"#94a3b8",maxWidth:760,margin:"0 auto",fontSize:18}}>
            Premium signals, protected dashboard, live engine, and referral-driven growth system ready for public launch.
          </p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1.1fr .9fr",gap:24}}>
          <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:20,padding:24}}>
            <h2 style={{marginTop:0}}>Launch Waitlist</h2>
            <p style={{color:"#94a3b8"}}>Capture demand before full public rollout and turn each signup into a referral node.</p>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
            <button
              onClick={joinWaitlist}
              style={{marginTop:16,padding:"14px 18px",borderRadius:12,border:"none",background:"#22c55e",color:"white",fontWeight:800,cursor:"pointer"}}
            >
              Join Waitlist + Get Referral Link
            </button>
            {referralLink ? (
              <div style={{marginTop:16,padding:16,borderRadius:12,background:"#0b1220",wordBreak:"break-all"}}>
                <div style={{fontSize:12,color:"#94a3b8"}}>Your referral link</div>
                <div style={{marginTop:8,fontWeight:700}}>{referralLink}</div>
              </div>
            ) : null}
            {ref ? <div style={{marginTop:16,color:"#60a5fa"}}>Referral detected: {ref}</div> : null}
            {status ? <div style={{marginTop:16,color:"#94a3b8"}}>{status}</div> : null}
          </div>

          <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:20,padding:24}}>
            <h2 style={{marginTop:0}}>Direct Contact Funnel</h2>
            <p style={{color:"#94a3b8"}}>Capture early customer requests, affiliate leads, and partnership demand.</p>
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" style={inputStyle} />
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
            <textarea value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Message" style={{...inputStyle,minHeight:140}} />
            <button
              onClick={sendMessage}
              style={{marginTop:16,padding:"14px 18px",borderRadius:12,border:"1px solid #334155",background:"#2563eb",color:"white",fontWeight:800,cursor:"pointer"}}
            >
              Send Launch Message
            </button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:18}}>
          <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:18,padding:20}}>
            <div style={{color:"#60a5fa",fontSize:13}}>Positioning</div>
            <div style={{fontSize:24,fontWeight:900,marginTop:10}}>Premium AI Signals</div>
            <div style={{color:"#94a3b8",marginTop:10}}>High-conviction decision layer for serious traders.</div>
          </div>
          <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:18,padding:20}}>
            <div style={{color:"#60a5fa",fontSize:13}}>Monetization</div>
            <div style={{fontSize:24,fontWeight:900,marginTop:10}}>Recurring Revenue</div>
            <div style={{color:"#94a3b8",marginTop:10}}>Subscriptions, premium access, launch waitlist, referral growth.</div>
          </div>
          <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:18,padding:20}}>
            <div style={{color:"#60a5fa",fontSize:13}}>Acceleration</div>
            <div style={{fontSize:24,fontWeight:900,marginTop:10}}>Built For Public Launch</div>
            <div style={{color:"#94a3b8",marginTop:10}}>Capture, qualify, convert, and route traffic into paid activation.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
