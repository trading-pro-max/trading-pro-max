"use client";

import { create } from "zustand";

type Mode = "SAFE" | "BALANCED" | "AGGRESSIVE";

type ControlState = {
  autoMode: boolean;
  riskMode: Mode;
  commandLog: string[];
  startAuto: () => void;
  stopAuto: () => void;
  pushLog: (v: string) => void;
};

let intervalRef: any = null;

export const useControlStore = create<ControlState>((set, get) => ({
  autoMode: false,
  riskMode: "BALANCED",
  commandLog: [],

  pushLog: (v) =>
    set((s) => ({
      commandLog: [v, ...s.commandLog].slice(0, 50),
    })),

  startAuto: () => {
    if (intervalRef) return;

    set({ autoMode: true });

    intervalRef = setInterval(() => {
      const actions = [
        "SCAN_MARKET",
        "AI_REBALANCE",
        "RISK_CHECK",
        "SIGNAL_UPDATE",
        "EXECUTE_STRATEGY"
      ];

      const action = actions[Math.floor(Math.random() * actions.length)];

      get().pushLog(
        new Date().toLocaleTimeString() + " · " + action + " · AUTO"
      );
    }, 3000);
  },

  stopAuto: () => {
    clearInterval(intervalRef);
    intervalRef = null;
    set({ autoMode: false });
  },
}));
