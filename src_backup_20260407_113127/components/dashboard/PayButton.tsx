"use client";

export default function PayButton() {
  const go = async () => {
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <button onClick={go} style={{
      padding:"16px",
      borderRadius:12,
      background:"#22c55e",
      color:"black",
      fontWeight:900,
      fontSize:16,
      cursor:"pointer"
    }}>
      ?? Activate Pro AI ($20/month)
    </button>
  );
}
