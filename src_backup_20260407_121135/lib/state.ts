export type RiskMode = "SAFE" | "BALANCED" | "AGGRESSIVE";

type AppState = {
  status: "ONLINE" | "PAUSED";
  autoMode: boolean;
  aiEnabled: boolean;
  riskMode: RiskMode;
  lastCommand: string;
  metrics: {
    engineReadiness: number;
    platformReadiness: number;
    launchReadiness: number;
    privateOperatorStack: number;
  };
  logs: { time: string; text: string }[];
  paperTrades: {
    id: string;
    symbol: string;
    signal: string;
    confidence: number;
    entry: number;
    exit?: number;
    status: string;
    pnl: number;
    createdAt: string;
  }[];
};

const g = globalThis as any;

if (!g.__TPM_CORE_STATE__) {
  g.__TPM_CORE_STATE__ = {
    status: "ONLINE",
    autoMode: true,
    aiEnabled: true,
    riskMode: "BALANCED",
    lastCommand: "BOOT",
    metrics: {
      engineReadiness: 82,
      platformReadiness: 76,
      launchReadiness: 68,
      privateOperatorStack: 72
    },
    logs: [
      { time: new Date().toISOString(), text: "CORE REBUILD ONLINE" }
    ],
    paperTrades: []
  } satisfies AppState;
}

export function getState(): AppState {
  return g.__TPM_CORE_STATE__;
}

export function addLog(text: string) {
  const s = getState();
  s.logs.unshift({ time: new Date().toISOString(), text });
  s.logs = s.logs.slice(0, 80);
}

export function runCommand(command: string) {
  const s = getState();
  s.lastCommand = command;

  switch (command) {
    case "AUTO_ON":
      s.autoMode = true;
      addLog("AUTO MODE ENABLED");
      break;
    case "AUTO_OFF":
      s.autoMode = false;
      addLog("AUTO MODE DISABLED");
      break;
    case "AI_ON":
      s.aiEnabled = true;
      addLog("AI ENABLED");
      break;
    case "AI_OFF":
      s.aiEnabled = false;
      addLog("AI DISABLED");
      break;
    case "RISK_SAFE":
      s.riskMode = "SAFE";
      addLog("RISK MODE SAFE");
      break;
    case "RISK_BALANCED":
      s.riskMode = "BALANCED";
      addLog("RISK MODE BALANCED");
      break;
    case "RISK_AGGRESSIVE":
      s.riskMode = "AGGRESSIVE";
      addLog("RISK MODE AGGRESSIVE");
      break;
    case "PAUSE_PLATFORM":
      s.status = "PAUSED";
      addLog("PLATFORM PAUSED");
      break;
    case "RESUME_PLATFORM":
      s.status = "ONLINE";
      addLog("PLATFORM RESUMED");
      break;
    case "SYSTEM_SCAN":
      s.metrics.engineReadiness = Math.min(100, s.metrics.engineReadiness + 1);
      addLog("SYSTEM SCAN COMPLETE");
      break;
    default:
      addLog("COMMAND EXECUTED -> " + command);
      break;
  }

  return s;
}

export function getLiveMarket() {
  return {
    symbol: "BTC/USDT",
    price: 68871.09,
    signal: "CALL",
    confidence: 84,
    time: new Date().toISOString()
  };
}