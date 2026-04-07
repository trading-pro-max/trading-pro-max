import { create } from "zustand";

type AppState = {
  selectedSymbol: string;
  selectedTimeframe: string;
  riskMode: string;
  setSelectedSymbol: (value: string) => void;
  setSelectedTimeframe: (value: string) => void;
  setRiskMode: (value: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedSymbol: "BTCUSDT",
  selectedTimeframe: "15m",
  riskMode: "balanced",
  setSelectedSymbol: (value) => set({ selectedSymbol: value }),
  setSelectedTimeframe: (value) => set({ selectedTimeframe: value }),
  setRiskMode: (value) => set({ riskMode: value }),
}));
