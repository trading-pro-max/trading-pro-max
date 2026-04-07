"use client";

import { useEffect } from "react";
import { useAutonomyStore } from "@/store/autonomy-store";

const improvements = [
  "Optimize signal ranking",
  "Reduce risk exposure",
  "Refine entry timing",
  "Improve pair selection",
  "Tighten loss control",
  "Enhance confidence weighting",
  "Strengthen capital preservation",
];

export default function SelfProfitLoop() {
  const { running, capital, riskPercent, applyCycle } = useAutonomyStore();

  useEffect(() => {
    if (!running) return;

    const cycle = async () => {
      try {
        const res = await fetch("/api/autonomy", { cache: "no-store" });
        const data = await res.json();
        if (!data?.ok || !data?.best) return;

        const best = data.best;
        const riskAmount = capital * (riskPercent / 100);

        let result: "WIN" | "LOSS" | "SKIP" = "SKIP";
        let pnl = 0;

        if (best.signal !== "HOLD") {
          const bias = Math.min(0.78, Math.max(0.52, best.confidence / 100));
          const won = Math.random() < bias;
          result = won ? "WIN" : "LOSS";
          pnl = Number((won ? riskAmount * 0.9 : -riskAmount * 0.65).toFixed(2));
        }

        const nextCapital = Number((capital + pnl).toFixed(2));
        const improvement = improvements[Math.floor(Math.random() * improvements.length)];

        applyCycle(
          {
            id: `${Date.now()}-${best.symbol}`,
            time: new Date().toLocaleTimeString(),
            action: "AUTO_PROFIT_CYCLE",
            pair: best.pair,
            signal: best.signal,
            confidence: best.confidence,
            result,
            pnl,
            capital: nextCapital,
          },
          improvement
        );
      } catch {}
    };

    cycle();
    const t = setInterval(cycle, 5000);
    return () => clearInterval(t);
  }, [running, capital, riskPercent, applyCycle]);

  return null;
}
