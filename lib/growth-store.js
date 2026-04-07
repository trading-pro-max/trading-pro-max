import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getState } from "./state.js";
import { readDb } from "./core-db.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "growth-center.json");

const DEFAULT_DATA = {
  plans: [
    { id: "PLAN-STARTER", name: "Starter", priceMonthly: 49, tier: "starter", seats: 1, features: ["control", "research", "paper", "alerts"] },
    { id: "PLAN-PRO", name: "Pro", priceMonthly: 149, tier: "pro", seats: 3, features: ["execution", "analytics", "portfolio", "risk"] },
    { id: "PLAN-INSTITUTION", name: "Institution", priceMonthly: 499, tier: "institution", seats: 10, features: ["brokers", "ops", "cloud", "backbone"] }
  ],
  customers: [],
  subscriptions: [],
  onboarding: []
};

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

function normalize(x) {
  return {
    plans: Array.isArray(x?.plans) ? x.plans : DEFAULT_DATA.plans,
    customers: Array.isArray(x?.customers) ? x.customers : [],
    subscriptions: Array.isArray(x?.subscriptions) ? x.subscriptions : [],
    onboarding: Array.isArray(x?.onboarding) ? x.onboarding : []
  };
}

export function readGrowth() {
  return normalize(readJson(FILE, DEFAULT_DATA));
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
    let customer = draft.customers.find((x) => String(x.email || "").toLowerCase() === email);

    if (!customer) {
      customer = {
        id: makeId("CUS"),
        name,
        email,
        segment,
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      };
      draft.customers.unshift(customer);
    }

    const flow = draft.onboarding.find((x) => x.customerId === customer.id);
    if (!flow) {
      draft.onboarding.unshift({
        id: makeId("ONB"),
        customerId: customer.id,
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

  const current = readGrowth();
  const plan = current.plans.find((x) => x.id === planId);
  if (!plan) return current;

  return mutateGrowth((draft) => {
    const exists = draft.subscriptions.find((x) => x.customerId === customerId && x.planId === planId && x.status === "ACTIVE");
    if (!exists) {
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
        ? { ...x, completedSteps: x.totalSteps, status: "COMPLETED", updatedAt: new Date().toISOString() }
        : x
    );
    return draft;
  });
}

export function buildPortal() {
  const growth = readGrowth();

  return growth.customers.map((customer) => {
    const onboarding = growth.onboarding.find((x) => x.customerId === customer.id) || null;
    const subscription = growth.subscriptions.find((x) => x.customerId === customer.id && x.status === "ACTIVE") || null;
    const plan = subscription ? growth.plans.find((x) => x.id === subscription.planId) : null;

    return { customer, onboarding, subscription, plan };
  });
}

export function buildGrowthStatus() {
  const growth = readGrowth();
  const state = getState();
  const db = readDb();
  const portal = buildPortal();

  const activeSubscriptions = growth.subscriptions.filter((x) => x.status === "ACTIVE");
  const mrr = Number(activeSubscriptions.reduce((s, x) => s + Number(x.amountMonthly || 0), 0).toFixed(2));
  const completedOnboarding = growth.onboarding.filter((x) => x.status === "COMPLETED").length;
  const customers = growth.customers.length;
  const conversionRate = customers > 0 ? Number(((activeSubscriptions.length / customers) * 100).toFixed(2)) : 0;

  const launchScore = Number((
    (
      Number(state.metrics?.engineReadiness || 0) +
      Number(state.metrics?.platformReadiness || 0) +
      Number(state.metrics?.launchReadiness || 0) +
      (db.session?.active ? 88 : 45) +
      (db.settings?.onboardingComplete ? 84 : 42) +
      (customers > 0 ? Math.min(100, 55 + customers * 6) : 30) +
      (activeSubscriptions.length > 0 ? Math.min(100, 60 + activeSubscriptions.length * 8) : 35) +
      (completedOnboarding > 0 ? Math.min(100, 58 + completedOnboarding * 10) : 30)
    ) / 8
  ).toFixed(2));

  return {
    totals: {
      customers,
      activeSubscriptions: activeSubscriptions.length,
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
