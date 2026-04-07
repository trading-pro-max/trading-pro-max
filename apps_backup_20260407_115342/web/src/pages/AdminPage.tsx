import React from "react";
export default function AdminPage(){
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{fontSize:12,letterSpacing:3,textTransform:"uppercase",color:"#7dd3fc"}}>Admin</div>
      <h2 style={{margin:0,fontSize:32}}>Admin</h2>
      <p style={{margin:0,color:"#94a3b8",lineHeight:1.7,maxWidth:860}}>Users, plans, permissions, audits and executive controls.</p>
    </div>
  );
}
