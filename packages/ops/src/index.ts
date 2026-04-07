export interface Incident {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  detail: string;
  createdAt: string;
}

export interface MetricCard {
  id: string;
  label: string;
  value: number | string;
}

export function buildMetricCards(input: {
  health: number;
  closedPnl: number;
  openPositions: number;
  incidents: number;
}): MetricCard[] {
  return [
    { id: "m1", label: "Health", value: input.health },
    { id: "m2", label: "Closed PnL", value: input.closedPnl.toFixed(2) },
    { id: "m3", label: "Open Positions", value: input.openPositions },
    { id: "m4", label: "Incidents", value: input.incidents }
  ];
}
