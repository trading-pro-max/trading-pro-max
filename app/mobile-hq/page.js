import { getProductRuntimeStatus } from "../../lib/tpm-product-runtime.mjs";
import { ProductRuntimePage } from "../_components/ProductRuntimePage";

export const dynamic = "force-dynamic";

export default function MobileHqPage() {
  const data = getProductRuntimeStatus();
  return (
    <ProductRuntimePage
      tag="TRADING PRO MAX"
      title="Mobile HQ"
      subtitle={`Cycle: ${data.runtime.cycle} · Mobile Cards: ${data.metrics.mobileCards}`}
      metrics={data.metrics}
      items={["Mobile shell", "Control cards", "Alerts", "Account view", "Positions", "Quick actions"]}
    />
  );
}
