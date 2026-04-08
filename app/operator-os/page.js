import { getProductRuntimeStatus } from "../../lib/tpm-product-runtime.mjs";
import { ProductRuntimePage } from "../_components/ProductRuntimePage";

export const dynamic = "force-dynamic";

export default function OperatorOsPage() {
  const data = getProductRuntimeStatus();
  return (
    <ProductRuntimePage
      tag="TRADING PRO MAX"
      title="Operator OS"
      subtitle={`Cycle: ${data.runtime.cycle} · Queue: ${data.metrics.operatorQueue}`}
      metrics={data.metrics}
      items={["Operations", "Queue", "Interventions", "Health", "Logs", "Escalations"]}
    />
  );
}
