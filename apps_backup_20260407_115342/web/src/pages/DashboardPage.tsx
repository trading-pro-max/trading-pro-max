import React from "react";
export default function DashboardPage(){
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{fontSize:12,letterSpacing:3,textTransform:"uppercase",color:"#7dd3fc"}}>Dashboard</div>
      <h2 style={{margin:0,fontSize:32}}>Dashboard</h2>
      <p style={{margin:0,color:"#94a3b8",lineHeight:1.7,maxWidth:860}}>Executive overview for runtime, AI, markets, risk, billing and platform control.</p>
    </div>
  );
}
