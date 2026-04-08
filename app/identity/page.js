import { getProductRuntimeStatus } from "../../lib/tpm-product-runtime.mjs";
import { ProductRuntimePage } from "../_components/ProductRuntimePage";

export const dynamic = "force-dynamic";

export default function IdentityPage() {
  const data = getProductRuntimeStatus();
  return (
    <ProductRuntimePage
      tag="TRADING PRO MAX"
      title="Identity"
      subtitle={`Cycle: ${data.runtime.cycle} · Sessions: ${data.metrics.activeSessions}`}
      metrics={data.metrics}
      items={["Access model", "Roles", "Sessions", "Permissions", "Recovery", "Audit trail"]}
    />
  );
}
