import { getControlState, pushControlLog } from "@/lib/control/state";

const globalRef = globalThis as any;

if (!globalRef.__TPM_AI_LOOP__) {
  globalRef.__TPM_AI_LOOP__ = true;

  setInterval(() => {
    const state = getControlState();

    if (!state.aiEnabled || state.status !== "ONLINE") return;

    // --- AI DECISION ENGINE ---
    const random = Math.random();

    if (state.autoMode) {
      if (random > 0.7) {
        pushControlLog("AI ACTION: MARKET SCAN");
        state.metrics.engineReadiness = Math.min(100, state.metrics.engineReadiness + 0.2);
      }

      if (random > 0.85) {
        pushControlLog("AI ACTION: STRATEGY ADJUST");
        state.metrics.platformReadiness = Math.min(100, state.metrics.platformReadiness + 0.3);
      }

      if (random > 0.95) {
        pushControlLog("AI ACTION: PROFIT OPTIMIZATION");
        state.metrics.privateOperatorStack = Math.min(100, state.metrics.privateOperatorStack + 0.4);
      }
    }

    // --- SELF EVOLUTION ---
    if (state.metrics.engineReadiness < 100) {
      state.metrics.engineReadiness += 0.05;
    }

    if (state.metrics.platformReadiness < 100) {
      state.metrics.platformReadiness += 0.05;
    }

  }, 1000);
}
