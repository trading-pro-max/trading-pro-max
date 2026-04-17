import { MarketIntelligenceWorkspace } from "../_components/MarketIntelligenceWorkspace";
import { ProductModulePage } from "../_components/ProductModulePage";
import { getProductRuntime, getSharedTradingProductData } from "../_components/product-data";
import { getCoreModuleByHref } from "../_components/product-modules";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Market Intelligence",
  description: "Connected market overview workspace for Trading Pro Max."
};

export default function Page() {
  const data = getSharedTradingProductData();
  const runtime = getProductRuntime();
  const module = getCoreModuleByHref("/market-intelligence");

  return (
    <ProductModulePage
      module={module}
      title="Market Intelligence"
      subtitle="Canonical market workspace for watchlists, signal strength, session posture, and instrument-level readouts."
      actions={[
        { href: "/strategy-lab", label: "Send To Strategy Lab", primary: true },
        { href: "/execution-center", label: "Open Execution Center" }
      ]}
      stats={[
        { label: "Signal Streams", value: String(runtime.metrics?.signalStreams ?? 0), hint: "Active intelligence lanes" },
        { label: "Feed Strength", value: `${data.marketFeeds?.[0]?.strength ?? 0}%`, hint: data.marketFeeds?.[0]?.title || "Primary feed" },
        { label: "Tracked Assets", value: String(data.watchlist.length), hint: "Priority workspace symbols" },
        { label: "Market Module", value: "ACTIVE", hint: "Local runtime source" }
      ]}
      metrics={[
        { label: "Desk Bias", value: data.watchlist[0]?.bias || "Mixed", hint: "Primary watchlist posture", tone: "success" },
        { label: "Top Symbol", value: data.watchlist[0]?.symbol || "N/A", hint: "Highest-priority instrument", tone: "info" },
        { label: "Session Mode", value: "Desktop First", hint: "Operator workstation context", tone: "neutral" }
      ]}
      sections={[
        {
          title: "Connected Market Workspace",
          subtitle: "Shared symbol, route, posture, and signal context for the product",
          content: <MarketIntelligenceWorkspace data={data} />
        }
      ]}
    />
  );
}
