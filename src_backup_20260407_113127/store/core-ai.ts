"use client";

import { create } from "zustand";

type Evolution = {
  version: number;
  improvements: string[];
};

type State = {
  autoMode: boolean;
  evolution: Evolution;
  logs: string[];
  start: () => void;
  push: (v: string) => void;
};

let loop: any = null;

export const useCore = create<State>((set, get) => ({
  autoMode: false,
  evolution: {
    version: 1,
    improvements: []
  },
  logs: [],

  push: (v) =>
    set((s) => ({
      logs: [v, ...s.logs].slice(0, 100)
    })),

  start: () => {
    if (loop) return;

    set({ autoMode: true });

    loop = setInterval(() => {
      const upgrades = [
        "Optimize strategy weights",
        "Reduce risk exposure",
        "Improve signal accuracy",
        "Refine execution timing",
        "Enhance profit routing",
        "Auto UI improvement",
        "System self-healing patch"
      ];

      const change = upgrades[Math.floor(Math.random() * upgrades.length)];

      set((s) => ({
        evolution: {
          version: s.evolution.version + 0.1,
          improvements: [change, ...s.evolution.improvements].slice(0, 20)
        },
        logs: [
          new Date().toLocaleTimeString() +
            " · SELF EVOLUTION ? " +
            change,
          ...s.logs
        ].slice(0, 100)
      }));
    }, 4000);
  }
}));
