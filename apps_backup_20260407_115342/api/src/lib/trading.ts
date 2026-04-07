import {
  PHASES,
  buildReport,
  calculateHealth,
  createId,
  type LedgerEntry,
  type OverviewResponse,
  type PresetMode,
  type SignalItem,
  type SignalSide
} from "@trading-pro-max/shared";
import { buildMockMarketSnapshots, type ReplayFrame } from "@trading-pro-max/data";
import { scoreMarket, canOpenPosition } from "@trading-pro-max/engine";
import { runMockBacktest } from "@trading-pro-max/studio";
import { buildMetricCards } from "@trading-pro-max/ops";
import { brokerAdapters, notificationChannels } from "@trading-pro-max/integrations";
import { defaultEnvironment } from "@trading-pro-max/cloud";
import { prisma, type Workspace } from "@/lib/db";

const timeframes = ["1m", "3m", "5m"] as const;
const sources = ["AI Flow", "Momentum Grid", "Session Pulse", "OTC Matrix", "Quant Edge"] as const;

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

async function getWorkspace(): Promise<Workspace> {
  const workspace = await prisma.workspace.findFirst();
  if (workspace) return workspace;
  return prisma.workspace.create({
    data: {
      name: "Trading Pro Max",
      environment: "local",
      engineStatus: "running",
      activePreset: "balanced",
      aiAssist: true,
      maxOpenPositions: 3,
      signalConfidenceGate: 86,
      paperStake: 25,
      portfolioBase: 10000,
      runningStrategies: 2
    }
  });
}

export async function bootstrapDataLayer(): Promise<void> {
  await getWorkspace();

  const journalCount = await prisma.journalEntry.count();
  if (journalCount === 0) {
    await prisma.journalEntry.create({
      data: {
        id: createId("JR"),
        text: "Backend Core bootstrapped with Prisma SQLite."
      }
    });
  }

  const incidentCount = await prisma.incident.count();
  if (incidentCount === 0) {
    await prisma.incident.create({
      data: {
        id: createId("INC"),
        severity: "medium",
        title: "Monitoring baseline",
        detail: "Ops monitoring initialized for local development."
      }
    });
  }
}

async function addJournal(text: string): Promise<void> {
  await prisma.journalEntry.create({
    data: {
      id: createId("JR"),
      text
    }
  });
}

export async function generateSignal(): Promise<SignalItem> {
  await bootstrapDataLayer();
  const workspace = await getWorkspace();
  const market = randomItem(buildMockMarketSnapshots());
  const decision = scoreMarket({ market, confidenceGate: workspace.signalConfidenceGate });
  const signal = await prisma.signal.create({
    data: {
      id: createId("SIG"),
      pair: market.symbol,
      side: decision.side,
      confidence: decision.confidence,
      timeframe: randomItem(timeframes),
      source: randomItem(sources),
      createdAt: new Date()
    }
  });
  await addJournal(`Signal generated: ${signal.pair} ${signal.side} ${signal.confidence}%`);
  return {
    id: signal.id,
    pair: signal.pair,
    side: signal.side as SignalSide,
    confidence: signal.confidence,
    timeframe: signal.timeframe as SignalItem["timeframe"],
    source: signal.source,
    createdAt: signal.createdAt.toISOString()
  };
}

export async function executeSignal(signalId: string): Promise<LedgerEntry | null> {
  const workspace = await getWorkspace();
  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) return null;

  const openPositions = await prisma.ledgerEntry.count({ where: { status: "filled" } });
  const decision = canOpenPosition({
    engineRunning: workspace.engineStatus === "running",
    openPositions,
    maxOpenPositions: workspace.maxOpenPositions,
    confidence: signal.confidence,
    gate: workspace.signalConfidenceGate
  });

  const entry = await prisma.ledgerEntry.create({
    data: {
      id: createId("LED"),
      pair: signal.pair,
      side: signal.side,
      status: decision.ok ? "filled" : "rejected",
      source: signal.source,
      timeframe: signal.timeframe,
      confidence: signal.confidence,
      stake: workspace.paperStake,
      pnl: 0,
      note: decision.reason,
      createdAt: new Date()
    }
  });

  await addJournal(`Execution ${entry.status}: ${entry.pair} ${entry.side} (${entry.note})`);

  return {
    id: entry.id,
    pair: entry.pair,
    side: entry.side as SignalSide,
    status: entry.status as LedgerEntry["status"],
    source: entry.source,
    timeframe: entry.timeframe,
    confidence: entry.confidence,
    stake: entry.stake,
    pnl: entry.pnl,
    createdAt: entry.createdAt.toISOString(),
    closedAt: entry.closedAt?.toISOString(),
    note: entry.note
  };
}

export async function closeOpenTrades(): Promise<void> {
  const openEntries = await prisma.ledgerEntry.findMany({ where: { status: "filled" }, take: 10, orderBy: { createdAt: "desc" } });
  for (const entry of openEntries) {
    if (Math.random() > 0.35) continue;
    const won = Math.random() < Math.max(0.55, Math.min(0.92, entry.confidence / 100));
    const pnl = won ? Number((entry.stake * 0.82).toFixed(2)) : -Number(entry.stake.toFixed(2));
    await prisma.ledgerEntry.update({
      where: { id: entry.id },
      data: {
        status: "closed",
        pnl,
        note: won ? "Paper trade won" : "Paper trade lost",
        closedAt: new Date()
      }
    });
  }
}

export async function setEngineStatus(nextStatus: "running" | "paused" | "stopped"): Promise<void> {
  const workspace = await getWorkspace();
  await prisma.workspace.update({ where: { id: workspace.id }, data: { engineStatus: nextStatus } });
  await addJournal(`Engine status changed to ${nextStatus}.`);
}

export async function applyPreset(preset: PresetMode): Promise<void> {
  const workspace = await getWorkspace();
  const map = {
    balanced: { maxOpenPositions: 3, signalConfidenceGate: 86, paperStake: 25, activePreset: "balanced", aiAssist: true },
    aggressive: { maxOpenPositions: 5, signalConfidenceGate: 80, paperStake: 40, activePreset: "aggressive", aiAssist: true },
    safe: { maxOpenPositions: 2, signalConfidenceGate: 90, paperStake: 15, activePreset: "safe", aiAssist: true },
    otc: { maxOpenPositions: 3, signalConfidenceGate: 84, paperStake: 22, activePreset: "otc", aiAssist: true }
  } as const;

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: map[preset]
  });

  await addJournal(`Preset applied: ${preset}`);
}

export async function addJournalEntry(text: string): Promise<void> {
  await addJournal(text);
}

export async function getOverview(): Promise<OverviewResponse> {
  const workspace = await getWorkspace();
  const closedTrades = await prisma.ledgerEntry.findMany({ where: { status: "closed" } });
  const openEntries = await prisma.ledgerEntry.findMany({ where: { status: "filled" } });
  const rejectedCount = await prisma.ledgerEntry.count({ where: { status: "rejected" } });
  const signalCount = await prisma.signal.count();
  const closedPnl = closedTrades.reduce((sum, item) => sum + item.pnl, 0);
  const openExposure = openEntries.reduce((sum, item) => sum + item.stake, 0);
  const wins = closedTrades.filter((item) => item.pnl > 0).length;
  const winRate = closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : 0;
  const healthScore = calculateHealth({
    engineStatus: workspace.engineStatus as OverviewResponse["engineStatus"],
    openPositions: openEntries.length,
    maxOpenPositions: workspace.maxOpenPositions,
    closedPnl,
    rejectedCount,
    aiAssist: workspace.aiAssist
  });

  return {
    workspaceName: workspace.name,
    engineStatus: workspace.engineStatus as OverviewResponse["engineStatus"],
    activePreset: workspace.activePreset as PresetMode,
    healthScore,
    portfolioBalance: workspace.portfolioBase + closedPnl,
    closedPnl,
    openPositions: openEntries.length,
    openExposure,
    rejectedCount,
    winRate,
    signalCount,
    runningStrategies: workspace.runningStrategies,
    phaseCount: PHASES.length
  };
}

export async function getReport(): Promise<string> {
  const overview = await getOverview();
  return buildReport({
    workspaceName: overview.workspaceName,
    engineStatus: overview.engineStatus,
    activePreset: overview.activePreset,
    healthScore: overview.healthScore,
    portfolioBalance: overview.portfolioBalance,
    closedPnl: overview.closedPnl,
    openPositions: overview.openPositions,
    openExposure: overview.openExposure,
    rejectedCount: overview.rejectedCount,
    signalCount: overview.signalCount,
    runningStrategies: overview.runningStrategies
  });
}

export function getPhases() {
  return PHASES;
}

export async function getSignals() {
  const items = await prisma.signal.findMany({ take: 30, orderBy: { createdAt: "desc" } });
  return items.map((signal) => ({
    id: signal.id,
    pair: signal.pair,
    side: signal.side as SignalSide,
    confidence: signal.confidence,
    timeframe: signal.timeframe as SignalItem["timeframe"],
    source: signal.source,
    createdAt: signal.createdAt.toISOString()
  }));
}

export async function getLedger() {
  const items = await prisma.ledgerEntry.findMany({ take: 120, orderBy: { createdAt: "desc" } });
  return items.map((entry) => ({
    id: entry.id,
    pair: entry.pair,
    side: entry.side as SignalSide,
    status: entry.status as LedgerEntry["status"],
    source: entry.source,
    timeframe: entry.timeframe,
    confidence: entry.confidence,
    stake: entry.stake,
    pnl: entry.pnl,
    createdAt: entry.createdAt.toISOString(),
    closedAt: entry.closedAt?.toISOString(),
    note: entry.note
  }));
}

export async function getJournal() {
  const items = await prisma.journalEntry.findMany({ take: 60, orderBy: { createdAt: "desc" } });
  return items.map((entry) => ({ id: entry.id, text: entry.text, createdAt: entry.createdAt.toISOString() }));
}

export function getDataLayer() {
  return {
    market: buildMockMarketSnapshots(),
    replayFrames: [
      {
        id: createId("RPL"),
        symbol: "EUR/USD",
        candles: Array.from({ length: 20 }).map((_, index) => ({
          symbol: "EUR/USD",
          timeframe: "1m",
          open: 1.08 + index * 0.0001,
          high: 1.081 + index * 0.0001,
          low: 1.079 + index * 0.0001,
          close: 1.0805 + index * 0.0001,
          timestamp: new Date(Date.now() - index * 60_000).toISOString()
        }))
      }
    ] satisfies ReplayFrame[]
  };
}

export async function getEngineLayer() {
  const workspace = await getWorkspace();
  return {
    engineStatus: workspace.engineStatus,
    activePreset: workspace.activePreset,
    confidenceGate: workspace.signalConfidenceGate,
    maxOpenPositions: workspace.maxOpenPositions,
    recentSignals: await getSignals()
  };
}

export async function getStudioLayer() {
  return {
    strategies: [
      { id: "str-precision", name: "Precision Scalper", version: "0.1.0", riskProfile: "Balanced" },
      { id: "str-breakout", name: "Session Breakout", version: "0.1.0", riskProfile: "Aggressive" },
      { id: "str-otc", name: "OTC Filter Core", version: "0.1.0", riskProfile: "Low" }
    ],
    sampleBacktest: runMockBacktest({ strategyId: "str-precision", symbol: "EUR/USD", timeframe: "5m", candles: 240 })
  };
}

export async function getOpsLayer() {
  const overview = await getOverview();
  const incidents = await prisma.incident.findMany({ take: 20, orderBy: { createdAt: "desc" } });
  return {
    metrics: buildMetricCards({ health: overview.healthScore, closedPnl: overview.closedPnl, openPositions: overview.openPositions, incidents: incidents.length }),
    incidents,
    report: await getReport()
  };
}

export async function getCloudLayer() {
  const workspace = await getWorkspace();
  return {
    workspaces: [
      { id: workspace.id, name: workspace.name, status: "local" },
      { id: "ws-cloud-eu", name: "Cloud EU Starter", status: "cloud-ready" }
    ],
    environments: [defaultEnvironment]
  };
}

export function getIntegrationLayer() {
  return {
    brokers: brokerAdapters,
    notifications: notificationChannels
  };
}

