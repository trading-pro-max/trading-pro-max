import { SurfacePage } from "../_components/SurfacePage";

export default function TradingCorePage() {
  return (
    <SurfacePage
      tag="TRADING PRO MAX"
      title="Real Trading Core"
      subtitle="Market, broker, execution, strategy, risk, and portfolio scaffolds."
      items={[
        "Market data",
        "Broker adapters",
        "Execution engine",
        "Strategy engine",
        "Risk engine",
        "Portfolio engine"
      ]}
    />
  );
}
