import { ProductModulePage } from "../_components/ProductModulePage";
import { StrategyLabWorkspace } from "../_components/StrategyLabWorkspace";
import { getSharedTradingProductData, getStrategyLabData } from "../_components/product-data";
import { getCoreModuleByHref } from "../_components/product-modules";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Strategy Lab",
  description: "Route qualification and execution readiness workspace for Trading Pro Max."
};

export default function Page() {
  const { runtime, routes } = getStrategyLabData();
  const data = getSharedTradingProductData();
  const module = getCoreModuleByHref("/strategy-lab");

  return (
    <ProductModulePage
      module={module}
      title="Strategy Lab"
      subtitle="Qualified routes, confidence filters, and execution programs live here. This is now the canonical strategy surface for the product-first architecture."
      actions={[
        { href: "/execution-center", label: "Open Execution Center", primary: true },
        { href: "/risk-control", label: "Review Risk Control" }
      ]}
      stats={[
        { label: "Overall", value: `${runtime.overallProgress}%`, hint: "Strategy runtime progress" },
        { label: "Core", value: `${runtime.domains?.core ?? 0}%`, hint: "Core strategy logic" },
        { label: "Surfaces", value: `${runtime.domains?.surfaces ?? 0}%`, hint: "Operator-facing UX" },
        { label: "Autonomy", value: `${runtime.domains?.autonomy ?? 0}%`, hint: "Automation posture" }
      ]}
      metrics={[
        { label: "Route Candidates", value: String(routes.length), hint: "Current strategy queue", tone: "info" },
        { label: "Top State", value: routes[0]?.state || "Review", hint: "Lead route state", tone: "success" },
        { label: "Operator Focus", value: "Qualification", hint: "Fastest product-first workflow", tone: "neutral" }
      ]}
      sections={[
        {
          title: "Connected Strategy Workspace",
          subtitle: "Shared route qualification, confidence, and execution readiness",
          content: <StrategyLabWorkspace data={data} />
        }
      ]}
    />
  );
}
