export type EngineStatus = "running" | "paused" | "stopped";
export type SignalSide = "CALL" | "PUT";
export type PresetMode = "balanced" | "aggressive" | "safe" | "otc";
export type PhaseStatus = "foundation" | "active" | "planned";

export type PhaseId =
  | 1 | 2 | 3 | 4 | 5 | 6
  | 7 | 8 | 9 | 10 | 11 | 12;

export interface PhaseItem {
  id: PhaseId;
  title: string;
  status: PhaseStatus;
  summary: string;
}

export interface SignalItem {
  id: string;
  pair: string;
  side: SignalSide;
  confidence: number;
  timeframe: "1m" | "3m" | "5m";
  source: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  pair: string;
  side: SignalSide;
  status: "filled" | "closed" | "rejected";
  source: string;
  timeframe: string;
  confidence: number;
  stake: number;
  pnl: number;
  createdAt: string;
  closedAt?: string;
  note: string;
}

export interface JournalEntry {
  id: string;
  text: string;
  createdAt: string;
}

export interface OverviewResponse {
  workspaceName: string;
  engineStatus: EngineStatus;
  activePreset: PresetMode;
  healthScore: number;
  portfolioBalance: number;
  closedPnl: number;
  openPositions: number;
  openExposure: number;
  rejectedCount: number;
  winRate: number;
  signalCount: number;
  runningStrategies: number;
  phaseCount: number;
}

export interface OpsTask {
  id: string;
  text: string;
}

export const PHASES: PhaseItem[] = [
  { id: 1, title: "Foundation", status: "foundation", summary: "Vision, repo standards, architecture, and engineering rules." },
  { id: 2, title: "Design System", status: "foundation", summary: "Visual language, layout rules, and reusable UX patterns." },
  { id: 3, title: "Desktop Core", status: "active", summary: "Local operator shell, dashboard, ops, journal, portfolio, reports." },
  { id: 4, title: "Backend Core", status: "active", summary: "API modules, auth starter, persistence, config, health, protected routes." },
  { id: 5, title: "Market/Data Layer", status: "active", summary: "Ingestion models, normalization, snapshots, replay contracts." },
  { id: 6, title: "Engine Layer", status: "active", summary: "Signal scoring, execution rules, acceptance and safety checks." },
  { id: 7, title: "Studio Layer", status: "active", summary: "Strategy research, backtest request models, simulation summaries." },
  { id: 8, title: "Operations Layer", status: "active", summary: "Metrics, incidents, reports, operational dashboards." },
  { id: 9, title: "Cloud Platform", status: "active", summary: "Workspace sync models, environment structure, hosted control path." },
  { id: 10, title: "Integrations Layer", status: "active", summary: "Broker connectors, notification channels, external hooks." },
  { id: 11, title: "Mobile Layer", status: "active", summary: "Expo starter for alerts, monitoring, and quick control flows." },
  { id: 12, title: "Production Closure", status: "active", summary: "Hardening docs, launch gaps, operational closure checklist." }
];

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

export function calculateHealth(input: {
  engineStatus: EngineStatus;
  openPositions: number;
  maxOpenPositions: number;
  closedPnl: number;
  rejectedCount: number;
  aiAssist: boolean;
}): number {
  let score = 100;
  if (input.engineStatus !== "running") score -= 20;
  if (input.openPositions >= input.maxOpenPositions) score -= 15;
  if (input.closedPnl < 0) score -= 15;
  if (input.rejectedCount > 4) score -= 10;
  if (!input.aiAssist) score -= 5;
  return Math.max(20, Math.min(100, score));
}

export function buildReport(args: {
  workspaceName: string;
  engineStatus: EngineStatus;
  activePreset: PresetMode;
  healthScore: number;
  portfolioBalance: number;
  closedPnl: number;
  openPositions: number;
  openExposure: number;
  rejectedCount: number;
  signalCount: number;
  runningStrategies: number;
}): string {
  return [
    `Trading Pro Max Operational Report`,
    `Workspace: ${args.workspaceName}`,
    `Engine: ${args.engineStatus}`,
    `Preset: ${args.activePreset}`,
    `Health: ${args.healthScore}/100`,
    `Portfolio Balance: ${args.portfolioBalance.toFixed(2)}`,
    `Closed PnL: ${args.closedPnl.toFixed(2)}`,
    `Open Positions: ${args.openPositions}`,
    `Open Exposure: ${args.openExposure.toFixed(2)}`,
    `Rejected Count: ${args.rejectedCount}`,
    `Signal Count: ${args.signalCount}`,
    `Running Strategies: ${args.runningStrategies}`
  ].join("\n");
}
export * from './platform';
export * from './services';
export * from './kernel';
export * from './contracts';
export * from './contracts/billing';
