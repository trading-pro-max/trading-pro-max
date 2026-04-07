"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const login = async () => {
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/control"
    });
  };

  return (
    <main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#020617",color:"white"}}>
      <div style={{background:"#111827",padding:30,borderRadius:20,width:320}}>
        <h2>Login</h2>
        <input placeholder="Email" onChange={e=>setEmail(e.target.value)} style={{width:"100%",marginTop:10,padding:10}} />
        <input placeholder="Password" type="password" onChange={e=>setPassword(e.target.value)} style={{width:"100%",marginTop:10,padding:10}} />
        <button onClick={login} style={{marginTop:20,width:"100%",padding:12,background:"#22c55e",fontWeight:900}}>
          Login
        </button>
      </div>
    </main>
  );
}
