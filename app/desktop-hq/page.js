import { getProductRuntimeStatus } from "../../lib/tpm-product-runtime.mjs";
import { ProductRuntimePage } from "../_components/ProductRuntimePage";

export const dynamic = "force-dynamic";

export default function DesktopHqPage() {
  const data = getProductRuntimeStatus();
  return (
    <ProductRuntimePage
      tag="TRADING PRO MAX"
      title="Desktop HQ"
      subtitle={`Cycle: ${data.runtime.cycle} · Desktop Cards: ${data.metrics.desktopCards}`}
      metrics={data.metrics}
      items={["Shell", "Multi-panel", "Watchlists", "Execution", "Research", "Control"]}
    />
  );
}
