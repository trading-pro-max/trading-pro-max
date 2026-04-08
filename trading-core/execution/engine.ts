import type { BrokerAdapter, BrokerOrder, BrokerExecution } from "../brokers/adapter";

export type ExecutionGuard = {
  allow: boolean;
  reason: string;
};

export async function routeExecution(
  adapter: BrokerAdapter,
  order: BrokerOrder,
  guard: ExecutionGuard
): Promise<BrokerExecution> {
  if (!guard.allow) {
    return {
      ok: false,
      broker: adapter.name,
      mode: adapter.mode,
      order,
      executionId: `blocked-${Date.now()}`,
      ts: new Date().toISOString()
    };
  }

  return adapter.execute(order);
}
