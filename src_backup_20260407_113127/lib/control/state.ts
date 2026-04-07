export type RiskMode = "SAFE" | "BALANCED" | "AGGRESSIVE";

type LogItem = {
  time: string;
  text: string;
};

type ControlState = {
  status: "ONLINE" | "PAUSED";
  autoMode: boolean;
  riskMode: RiskMode;
  aiEnabled: boolean;
  lastCommand: string;
  metrics: {
    engineReadiness: number;
    platformReadiness: number;
    launchReadiness: number;
    privateOperatorStack: number;
  };
  logs: LogItem[];
};

const globalRef = globalThis as typeof globalThis & {
  __TPM_CONTROL__?: ControlState;
};

if (!globalRef.__TPM_CONTROL__) {
  globalRef.__TPM_CONTROL__ = {
    status: "ONLINE",
    autoMode: true,
    riskMode: "BALANCED",
    aiEnabled: true,
    lastCommand: "BOOT",
    metrics: {
      engineReadiness: 99,
      platformReadiness: 98,
      launchReadiness: 96,
      privateOperatorStack: 90,
    },
    logs: [
      {
        time: new Date().toISOString(),
        text: "SYSTEM BOOTED",
      },
    ],
  };
}

export function getControlState() {
  return globalRef.__TPM_CONTROL__!;
}

export function pushControlLog(text: string) {
  const state = getControlState();
  state.logs.unshift({
    time: new Date().toISOString(),
    text,
  });
  state.logs = state.logs.slice(0, 80);
}

export function patchControlState(partial: Partial<ControlState>) {
  const state = getControlState();
  Object.assign(state, partial);
  return state;
}

export function executeControlCommand(command: string) {
  const state = getControlState();
  state.lastCommand = command;

  switch (command) {
    case "SYSTEM_SCAN":
      pushControlLog("SYSTEM SCAN EXECUTED");
      state.metrics.engineReadiness = Math.min(100, state.metrics.engineReadiness + 1);
      break;

    case "AI_ON":
      state.aiEnabled = true;
      pushControlLog("AI ENABLED");
      break;

    case "AI_OFF":
      state.aiEnabled = false;
      pushControlLog("AI DISABLED");
      break;

    case "AUTO_ON":
      state.autoMode = true;
      pushControlLog("AUTO MODE ENABLED");
      break;

    case "AUTO_OFF":
      state.autoMode = false;
      pushControlLog("AUTO MODE DISABLED");
      break;

    case "RISK_SAFE":
      state.riskMode = "SAFE";
      pushControlLog("RISK MODE SET TO SAFE");
      break;

    case "RISK_BALANCED":
      state.riskMode = "BALANCED";
      pushControlLog("RISK MODE SET TO BALANCED");
      break;

    case "RISK_AGGRESSIVE":
      state.riskMode = "AGGRESSIVE";
      pushControlLog("RISK MODE SET TO AGGRESSIVE");
      break;

    case "PAUSE_PLATFORM":
      state.status = "PAUSED";
      pushControlLog("PLATFORM PAUSED");
      break;

    case "RESUME_PLATFORM":
      state.status = "ONLINE";
      pushControlLog("PLATFORM RESUMED");
      break;

    case "SELF_HEAL":
      pushControlLog("SELF HEAL PATCH EXECUTED");
      state.metrics.platformReadiness = Math.min(100, state.metrics.platformReadiness + 1);
      break;

    case "DEPLOY_CHECK":
      pushControlLog("DEPLOY CHECK EXECUTED");
      break;

    case "OWNER_LOCK":
      pushControlLog("OWNER LOCK APPLIED");
      break;

    default:
      pushControlLog("UNKNOWN COMMAND: " + command);
      break;
  }

  return state;
}
