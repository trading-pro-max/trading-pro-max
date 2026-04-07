"use client";

export default function TradeButton() {

  const execute = async () => {
    const res = await fetch("/api/trade", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        action: "BUY",
        qty: 1,
      }),
    });

    const data = await res.json();
    alert(JSON.stringify(data));
  };

  return (
    <button
      onClick={execute}
      style={{
        marginTop: 20,
        padding: "14px 24px",
        background: "#22c55e",
        border: "none",
        borderRadius: 10,
        color: "white",
        cursor: "pointer"
      }}
    >
      Execute REAL Trade
    </button>
  );
}
