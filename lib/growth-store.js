import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getState } from "./state.js";
import { readDb } from "./core-db.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "growth-center.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function makeId(prefix = "GRW") {
  return prefix + "-" + randomUUID().slice(0, 8).toUpperCase();
}

function readJson(file, fallback) {
  try {
    ensureDir();
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return value;
}

const DEFAULT_GROWTH = {
  plans: [
    {
      id: "PLAN-STARTER",
      name: "Starter",
      priceMonthly: 49,
      tier: "starter",
      seats: 1,
      features: ["mission control", "research", "paper trading", "alerts"]
    },
    {
      id: "PLAN-PRO",
      name: "Pro",
      priceMonthly: 149,
      tier: "pro",
      seats: 3,
      features: ["everything in starter", "execution", "portfolio lab", "analytics", "risk center"]
    },
    {
      id: "PLAN-INSTITUTION",
      name: "Institution",
      priceMonthly: 499,
      tier: "institution",
      seats: 10,
      features: ["everything in pro", "broker hub", "ops center", "cloud control", "priority rollout"]
    }
  ],
  customers: [],
  subscriptions: [],
  onboarding: []
};

function normalizePlan(x) {
  return {
    id: x?.id || makeId("PLAN"),
    name: x?.name || "Plan",
    priceMonthly: Number(x?.priceMonthly || 0),
    tier: x?.tier || "custom",
    seats: Number(x?.seats || 1),
    features: Array.isArray(x?.features) ? x.features : []
  };
}

function normalizeCustomer(x) {
  return {
    id: x?.id || makeId("CUS"),
    name: x?.name || "Customer",
    email: x?.email || "",
    segment: x?.segment || "RETAIL",
    status: x?.status || "LEAD",
    createdAt: x?.createdAt || new Date().toISOString()
  };
}

function normalizeSubscription(x) {
  return {
    id: x?.id || makeId("SUB"),
    customerId: x?.customerId || null,
    planId: x?.planId || null,
    status: x?.status || "DRAFT",
    amountMonthly: Number(x?.amountMonthly || 0),
    startedAt: x?.startedAt || null,
    renewalAt: x?.renewalAt || null
  };
}

function normalizeOnboarding(x) {
  return {
    id: x?.id || makeId("ONB"),
    customerId: x?.customerId || null,
    completedSteps: Number(x?.completedSteps || 0),
    totalSteps: Number(x?.totalSteps || 6),
    status: x?.status || "PENDING",
    updatedAt: x?.updatedAt || new Date().toISOString()
  };
}

function normalize(x) {
  return {
    plans: Array.isArray(x?.plans) ? x.plans.map(normalizePlan) : DEFAULT_GROWTH.plans.map(normalizePlan),
    customers: Array.isArray(x?.customers) ? x.customers.map(normalizeCustomer) : [],
    subscriptions: Array.isArray(x?.subscriptions) ? x.subscriptions.map(normalizeSubscription) : [],
    onboarding: Array.isArray(x?.onboarding) ? x.onboarding.map(normalizeOnboarding) : []
  };
}

export function readGrowth() {
  return normalize(readJson(FILE, DEFAULT_GROWTH));
}

export function writeGrowth(x) {
  return writeJson(FILE, normalize(x));
}

export function mutateGrowth(mutator) {
  const current = readGrowth();
  const next = mutator(structuredClone(current)) || current;
  return writeGrowth(next);
}

export function createCustomer(payload = {}) {
  const name = String(payload.name || "Customer").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const segment = String(payload.segment || "RETAIL").trim().toUpperCase();

  if (!email) return readGrowth();

  return mutateGrowth((draft) => {
    let existing = draft.customers.find((x) => String(x.email || "").toLowerCase() === email);

    if (!existing) {
      existing = {
        id: makeId("CUS"),
        name,
        email,
        segment,
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      };
      draft.customers.unshift(existing);
    }

    const onboarding = draft.onboarding.find((x) => x.customerId === existing.id);
    if (!onboarding) {
      draft.onboarding.unshift({
        id: makeId("ONB"),
        customerId: existing.id,
        completedSteps: 1,
        totalSteps: 6,
        status: "STARTED",
        updatedAt: new Date().toISOString()
      });
    }

    return draft;
  });
}

export function createSubscription(payload = {}) {
  const customerId = String(payload.customerId || "").trim();
  const planId = String(payload.planId || "").trim();

  if (!customerId || !planId) return readGrowth();

  const growth = readGrowth();
  const plan = growth.plans.find((x) => x.id === planId);
  if (!plan) return growth;

  return mutateGrowth((draft) => {
    const existing = draft.subscriptions.find((x) => x.customerId === customerId && x.planId === planId && x.status === "ACTIVE");
    if (!existing) {
      draft.subscriptions.unshift({
        id: makeId("SUB"),
        customerId,
        planId,
        status: "ACTIVE",
        amountMonthly: Number(plan.priceMonthly || 0),
        startedAt: new Date().toISOString(),
        renewalAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    return draft;
  });
}

export function completeOnboarding(payload = {}) {
  const customerId = String(payload.customerId || "").trim();
  if (!customerId) return readGrowth();

  return mutateGrowth((draft) => {
    draft.onboarding = draft.onboarding.map((x) =>
      x.customerId === customerId
        ? {
            ...x,
            completedSteps: x.totalSteps,
            status: "COMPLETED",
            updatedAt: new Date().toISOString()
          }
        : x
    );
    return draft;
  });
}

export function buildPortal() {
  const growth = readGrowth();

  const rows = growth.customers.map((customer) => {
    const onboarding = growth.onboarding.find((x) => x.customerId === customer.id) || null;
    const subscriptions = growth.subscriptions.filter((x) => x.customerId === customer.id);
    const activeSub = subscriptions.find((x) => x.status === "ACTIVE") || null;
    const plan = activeSub ? growth.plans.find((x) => x.id === activeSub.planId) : null;

    return {
      customer,
      onboarding,
      subscription: activeSub,
      plan
    };
  });

  return rows;
}

export function buildGrowthStatus() {
  const growth = readGrowth();
  const state = getState();
  const db = readDb();
  const portal = buildPortal();

  const activeSubs = growth.subscriptions.filter((x) => x.status === "ACTIVE");
  const mrr = Number(activeSubs.reduce((s, x) => s + Number(x.amountMonthly || 0), 0).toFixed(2));
  const completedOnboarding = growth.onboarding.filter((x) => x.status === "COMPLETED").length;
  const customers = growth.customers.length;
  const conversionRate = customers > 0 ? Number(((activeSubs.length / customers) * 100).toFixed(2)) : 0;

  const launchScore = Number((
    (
      Number(state.metrics?.engineReadiness || 0) +
      Number(state.metrics?.platformReadiness || 0) +
      Number(state.metrics?.launchReadiness || 0) +
      (db.session?.active ? 88 : 45) +
      (db.settings?.onboardingComplete ? 84 : 42) +
      (customers > 0 ? Math.min(100, 55 + customers * 6) : 30) +
      (activeSubs.length > 0 ? Math.min(100, 60 + activeSubs.length * 8) : 35) +
      (completedOnboarding > 0 ? Math.min(100, 58 + completedOnboarding * 10) : 30)
    ) / 8
  ).toFixed(2));

  return {
    totals: {
      customers,
      activeSubscriptions: activeSubs.length,
      mrr,
      onboardingCompleted: completedOnboarding,
      plans: growth.plans.length,
      conversionRate
    },
    portal,
    launchScore,
    updatedAt: new Date().toISOString()
  };
}
