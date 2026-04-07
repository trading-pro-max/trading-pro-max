import type { MarketSnapshot } from "@trading-pro-max/data";

export interface EngineSignalInput {
  market: MarketSnapshot;
  confidenceGate: number;
}

export interface EngineDecision {
  accepted: boolean;
  side: "CALL" | "PUT";
  confidence: number;
  note: string;
}

export function scoreMarket(input: EngineSignalInput): EngineDecision {
  const confidence = Math.max(72, Math.min(97, Math.round(76 + Math.abs(input.market.change) * 18 + (input.market.volatility === "High" ? 12 : input.market.volatility === "Medium" ? 7 : 3))));
  const side = input.market.change >= 0 ? "CALL" : "PUT";
  const accepted = confidence >= input.confidenceGate;
  return {
    accepted,
    side,
    confidence,
    note: accepted ? "Accepted by engine rules" : "Blocked by confidence gate"
  };
}

export function canOpenPosition(args: {
  engineRunning: boolean;
  openPositions: number;
  maxOpenPositions: number;
  confidence: number;
  gate: number;
}): { ok: boolean; reason: string } {
  if (!args.engineRunning) return { ok: false, reason: "Engine not running" };
  if (args.openPositions >= args.maxOpenPositions) return { ok: false, reason: "Max open positions reached" };
  if (args.confidence < args.gate) return { ok: false, reason: "Confidence below gate" };
  return { ok: true, reason: "Execution allowed" };
}
