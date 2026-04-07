"use client";

export default function PremiumPage() {
  const handlePay = async () => {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <main style={{
      height:"100vh",
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      background:"#020617",
      color:"white"
    }}>
      <button
        onClick={handlePay}
        style={{
          padding:"16px 28px",
          borderRadius:12,
          background:"#22c55e",
          color:"white",
          fontWeight:700,
          fontSize:18
        }}
      >
        ?? Subscribe Now ($20/month)
      </button>
    </main>
  );
}
