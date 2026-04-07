"use client";

export default function CommandDeck({ onAction }: { onAction: (action: string) => void }) {
  const actions = [
    "SYSTEM_SCAN",
    "AI_REBALANCE",
    "PRIVATE_SYNC",
    "RISK_LOCK",
    "SIGNAL_REFRESH",
    "LAUNCH_CHECK"
  ];

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>
      {actions.map((action) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          style={{
            background:"#111827",
            color:"white",
            border:"1px solid #1f2937",
            borderRadius:18,
            padding:20,
            fontWeight:800,
            cursor:"pointer"
          }}
        >
          {action}
        </button>
      ))}
    </div>
  );
}
