"use client";

import { create } from "zustand";

type JournalItem = {
  id: string;
  time: string;
  action: string;
  pair: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  result: "WIN" | "LOSS" | "SKIP";
  pnl: number;
  capital: number;
};

type State = {
  running: boolean;
  capital: number;
  peakCapital: number;
  riskPercent: number;
  trades: number;
  wins: number;
  losses: number;
  journal: JournalItem[];
  improvements: string[];
  version: number;
  setRunning: (v: boolean) => void;
  applyCycle: (item: JournalItem, improvement?: string) => void;
  reset: () => void;
};

export const useAutonomyStore = create<State>((set) => ({
  running: true,
  capital: 1000,
  peakCapital: 1000,
  riskPercent: 2,
  trades: 0,
  wins: 0,
  losses: 0,
  journal: [],
  improvements: [],
  version: 1,
  setRunning: (running) => set({ running }),
  applyCycle: (item, improvement) =>
    set((s) => {
      const peakCapital = Math.max(s.peakCapital, item.capital);
      return {
        capital: item.capital,
        peakCapital,
        trades: item.result === "SKIP" ? s.trades : s.trades + 1,
        wins: item.result === "WIN" ? s.wins + 1 : s.wins,
        losses: item.result === "LOSS" ? s.losses + 1 : s.losses,
        journal: [item, ...s.journal].slice(0, 60),
        improvements: improvement ? [improvement, ...s.improvements].slice(0, 20) : s.improvements,
        version: improvement ? Number((s.version + 0.1).toFixed(1)) : s.version,
      };
    }),
  reset: () =>
    set({
      running: true,
      capital: 1000,
      peakCapital: 1000,
      riskPercent: 2,
      trades: 0,
      wins: 0,
      losses: 0,
      journal: [],
      improvements: [],
      version: 1,
    }),
}));
