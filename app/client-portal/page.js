import { getProductRuntimeStatus } from "../../lib/tpm-product-runtime.mjs";
import { ProductRuntimePage } from "../_components/ProductRuntimePage";

export const dynamic = "force-dynamic";

export default function ClientPortalPage() {
  const data = getProductRuntimeStatus();
  return (
    <ProductRuntimePage
      tag="TRADING PRO MAX"
      title="Client Portal"
      subtitle={`Cycle: ${data.runtime.cycle} · Users: ${data.metrics.users}`}
      metrics={data.metrics}
      items={["Overview", "Accounts", "Performance", "Activity", "Settings", "Support"]}
    />
  );
}
