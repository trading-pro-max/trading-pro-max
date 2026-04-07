import { NextResponse } from "next/server";
import { getState } from "../../../../lib/state.js";
import { getEngineStatus } from "../../../../lib/engine.js";
import { readDb } from "../../../../lib/core-db.js";
import { readAudit, readBackups } from "../../../../lib/ops-store.js";

export async function GET() {
  const state = getState();
  const engine = getEngineStatus();
  const db = readDb();
  const audit = readAudit();
  const backups = readBackups();

  const items = [];

  items.push({
    id: "NF-CORE",
    type: "core",
    severity: state.status === "ONLINE" ? "success" : "danger",
    title: "Core status",
    message: "System is " + state.status,
    time: new Date().toISOString()
  });

  items.push({
    id: "NF-ENGINE",
    type: "engine",
    severity: engine.running ? "success" : "warning",
    title: "Engine status",
    message: engine.running ? ("Engine running · ticks " + engine.ticks) : "Engine stopped",
    time: engine.lastTick || new Date().toISOString()
  });

  items.push({
    id: "NF-GUARD",
    type: "guardian",
    severity: state.protection?.killSwitch ? "danger" : "success",
    title: "Guardian shield",
    message: "Guardian " + (state.protection?.guardianStatus || "UNKNOWN") + " · session " + (state.protection?.sessionMode || "UNKNOWN"),
    time: new Date().toISOString()
  });

  items.push({
    id: "NF-IDENTITY",
    type: "identity",
    severity: db.session?.active ? "success" : "warning",
    title: "Identity session",
    message: db.session?.active ? ("Active session for " + (db.session.userId || "unknown")) : "No active session",
    time: db.session?.lastLoginAt || new Date().toISOString()
  });

  items.push({
    id: "NF-WORKSPACE",
    type: "workspace",
    severity: "info",
    title: "Workspace footprint",
    message: "Watchlist " + db.watchlist.length + " · Alerts " + db.alerts.length + " · Orders " + db.orders.length + " · Journal " + db.journal.length,
    time: new Date().toISOString()
  });

  (state.logs || []).slice(0, 10).forEach((x, i) => {
    items.push({
      id: "NF-LOG-" + i,
      type: "log",
      severity: "info",
      title: "Live log",
      message: x.text,
      time: x.time
    });
  });

  (audit || []).slice(0, 10).forEach((x) => {
    items.push({
      id: x.id,
      type: "audit",
      severity: x.severity || "info",
      title: x.event || "audit",
      message: x.message || "",
      time: x.time || new Date().toISOString()
    });
  });

  if (Array.isArray(backups) && backups.length > 0) {
    const latest = backups[0];
    items.push({
      id: latest.id,
      type: "backup",
      severity: "success",
      title: "Latest backup",
      message: latest.label + " · " + latest.id,
      time: latest.createdAt || new Date().toISOString()
    });
  }

  const sorted = items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json({
    total: sorted.length,
    unreadEstimate: sorted.filter(x => x.severity === "warning" || x.severity === "danger").length,
    items: sorted
  });
}
