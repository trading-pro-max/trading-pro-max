import type { StrategySignal } from "../strategy/engine";

export type RiskDecision = {
  allow: boolean;
  reason: string;
  maxSize: number;
};

export function evaluateRisk(signal: StrategySignal, balance = 100000): RiskDecision {
  const baseSize = Math.max(1, Math.floor(balance * 0.001));
  const allow = signal.confidence >= 70;
  return {
    allow,
    reason: allow ? "risk-accepted" : "risk-rejected",
    maxSize: baseSize
  };
}
