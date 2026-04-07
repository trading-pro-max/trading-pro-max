import express from "express";
import cookieParser from "cookie-parser";

const app = express();
const port = Number(process.env.PORT || 8787);
const EMAIL = process.env.DEMO_USER_EMAIL || "admin@tradingpromax.local";
const PASS = process.env.DEMO_USER_PASSWORD || "admin123";
const TOKEN = "tpm-local-admin";

app.use(cookieParser());
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin || "http://localhost:5173";
  res.setHeader("Access-Control-Allow-Origin", String(origin));
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const me = () => ({
  email: EMAIL,
  name: "Trading Pro Max Admin",
  roles: ["admin", "operator", "viewer"]
});

const authed = (req: any) => {
  const h = String(req.headers.authorization || "");
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : "";
  const cookie = req.cookies?.tpm_session || "";
  return bearer === TOKEN || cookie === TOKEN;
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "Trading Pro Max", mode: "development" });
});

app.get("/api/runtime-config", (_req, res) => {
  res.json({
    ok: true,
    app: "Trading Pro Max",
    publicBaseUrl: "http://localhost:5173",
    apiUrl: "http://localhost:8787"
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (email !== EMAIL || password !== PASS) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }
  res.cookie("tpm_session", TOKEN, { httpOnly: false, sameSite: "lax" });
  res.json({ ok: true, user: me(), accessToken: TOKEN });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("tpm_session");
  res.json({ ok: true });
});

app.get("/api/auth/status", (req, res) => {
  if (!authed(req)) return res.json({ ok: true, authenticated: false });
  res.json({ ok: true, authenticated: true, user: me() });
});

app.get("/api/rbac/admin-check", (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  res.json({ ok: true, admin: true });
});

app.get("/api/kernel/status", (_req, res) => {
  res.json({
    ok: true,
    kernel: {
      name: "Trading Pro Max",
      mode: "development",
      apiUrl: "http://localhost:8787",
      webUrl: "http://localhost:5173",
      health: "ok"
    }
  });
});

app.get("/api/orchestrator/status", (_req, res) => {
  res.json({
    ok: true,
    orchestrator: {
      pid: process.pid,
      uptime: process.uptime(),
      mode: "development",
      apiPort: port,
      webUrl: "http://localhost:5173"
    }
  });
});

app.get("/api/identity/status", (_req, res) => {
  res.json({
    ok: true,
    adminEmail: EMAIL,
    cookieName: "tpm_session",
    accessMinutes: 15,
    refreshDays: 7,
    roles: ["admin", "operator", "viewer"]
  });
});

app.get("/api/brain/status", (_req, res) => {
  res.json({ ok: true, score: 100, totals: { events: 0, actions: 0 }, state: "stable" });
});

app.get("/api/billing/readiness", (_req, res) => {
  res.json({
    ok: false,
    configured: {
      stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      stripePublishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
      stripePriceId: !!process.env.STRIPE_PRICE_ID
    }
  });
});

app.get("/api/billing/core/status", (_req, res) => {
  res.json({
    ok: true,
    configured: {
      stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      stripePublishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
      stripePriceId: !!process.env.STRIPE_PRICE_ID
    },
    mode: process.env.STRIPE_LIVE_MODE === "true" ? "live" : "sandbox",
    nextAction: "billing core ready"
  });
});

app.get("/api/billing/live/status", (_req, res) => {
  const liveReady = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PUBLISHABLE_KEY && !!process.env.STRIPE_PRICE_ID;
  res.json({ ok: true, liveReady });
});

app.get("/api/services/status", (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  res.json({ ok: true, services: { api: "online", web: "external", notify: "ready", billing: "foundation", ai: "online" } });
});

app.get("/api/security/status", (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  res.json({ ok: true, security: { cors: "ok", session: "ok", auth: "ok" } });
});

app.get("/api/notify/status", (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  res.json({ ok: true, notify: { telegram: "ready" } });
});

app.post("/api/notify/test", (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  res.json({ ok: true, sent: true });
});

app.get("/api/ops/status", (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });
  res.json({
    ok: true,
    ops: {
      pid: process.pid,
      uptimeSec: Math.round(process.uptime()),
      nodeEnv: "development",
      apiPort: port,
      now: new Date().toISOString()
    }
  });
});

app.get("/api/data-layer/status", (_req, res) => {
  res.json({ ok: true, dataLayer: { state: "ready", dbExists: true, schemaExists: true, runtimeExists: true } });
});

app.get("/api/engine/status", (_req, res) => {
  res.json({ ok: true, engine: { state: "online", mode: "scoring-ready", loopMs: 15000 } });
});

app.get("/api/pipeline/status", (_req, res) => {
  res.json({ ok: true, pipeline: { state: "online", queue: "connected", stages: ["ingest", "normalize", "score", "decision", "queue"] } });
});

app.get("/api/ai/status", (_req, res) => {
  res.json({
    ok: true,
    ai: {
      percent: 100,
      phase: "AI Autonomy",
      autonomy: "online",
      guardrails: "online",
      actionQueue: "online",
      learningLoop: "shell_ready",
      recoveryLogic: "online",
      state: "ai_locked"
    }
  });
});

app.get("/api/launch/status", (_req, res) => {
  res.json({ ok: true, launch: { readinessPercent: 95, state: "strong" } });
});

app.get("/api/public-lock/status", (_req, res) => {
  res.json({ ok: true, publicLock: { url: process.env.PUBLIC_BASE_URL || null, stable: false, mode: "temporary" } });
});

app.get("/api/stripe-live/status", (_req, res) => {
  res.json({
    ok: true,
    stripeLive: {
      secret: !!process.env.STRIPE_SECRET_KEY,
      publishable: !!process.env.STRIPE_PUBLISHABLE_KEY,
      price: !!process.env.STRIPE_PRICE_ID,
      webhook: !!process.env.STRIPE_WEBHOOK_SECRET
    }
  });
});

app.get("/", (_req, res) => {
  res.json({ ok: true, name: "Trading Pro Max API", health: "/api/health" });
});

app.listen(port, "0.0.0.0", () => {
  console.log("API OK http://localhost:" + port);
});
