import { getProductRuntimeStatus } from "../../lib/tpm-product-runtime.mjs";
import { ProductRuntimePage } from "../_components/ProductRuntimePage";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  const data = getProductRuntimeStatus();
  return (
    <ProductRuntimePage
      tag="TRADING PRO MAX"
      title="Billing"
      subtitle={`Cycle: ${data.runtime.cycle} · Subscriptions: ${data.metrics.subscriptions}`}
      metrics={data.metrics}
      items={["Plans", "Subscription state", "Invoices", "Payment methods", "Upgrades", "Entitlements"]}
    />
  );
}
