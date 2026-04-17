import { ExecutionTerminal } from "../_components/ExecutionTerminal";
import { ProductShell } from "../_components/ProductShell";
import { getExecutionCenterData, getProductRuntime } from "../_components/product-data";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Execution Center",
  description: "Flagship execution terminal for Trading Pro Max."
};

export default function Page() {
  const data = getExecutionCenterData();
  const runtime = getProductRuntime();

  return (
    <ProductShell
      eyebrow="Trading Pro Max"
      title="Execution Center"
      subtitle="Desktop-first trading terminal for charting, watchlists, order entry, positions, order flow, AI support, and risk-aware execution control."
      actions={[
        { href: "/risk-control", label: "Review Risk Gates" },
        { href: "/ai-copilot", label: "Open AI Copilot" },
        { href: "/journal-vault", label: "Log Session State", primary: true }
      ]}
      stats={[
        { label: "Status", value: data.runtime.status, hint: data.runtime.title || "Execution runtime" },
        { label: "Execution Confidence", value: `${data.runtime.metrics?.confidence ?? 0}%`, hint: "Live execution confidence" },
        { label: "Routes", value: String(runtime.metrics?.executionRoutes ?? 0), hint: "Tracked routes in the product" },
        { label: "Primary Route", value: data.primaryRoute.asset, hint: `${data.primaryRoute.name} • ${data.primaryRoute.state}` }
      ]}
    >
      <ExecutionTerminal data={data} />
    </ProductShell>
  );
}
