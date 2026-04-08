export type BrokerMode = "paper" | "live";

export type BrokerOrder = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  type: "MARKET" | "LIMIT";
  price?: number;
};

export type BrokerExecution = {
  ok: boolean;
  broker: string;
  mode: BrokerMode;
  order: BrokerOrder;
  executionId: string;
  ts: string;
};

export interface BrokerAdapter {
  name: string;
  mode: BrokerMode;
  execute(order: BrokerOrder): Promise<BrokerExecution>;
}

export function createPaperBroker(name = "paper-broker"): BrokerAdapter {
  return {
    name,
    mode: "paper",
    async execute(order) {
      return {
        ok: true,
        broker: name,
        mode: "paper",
        order,
        executionId: `${name}-${Date.now()}`,
        ts: new Date().toISOString()
      };
    }
  };
}
