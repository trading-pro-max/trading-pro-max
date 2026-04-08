import { getProductRuntimeStatus } from "../../lib/tpm-product-runtime.mjs";
import { ProductRuntimePage } from "../_components/ProductRuntimePage";

export const dynamic = "force-dynamic";

export default function WorkspacePage() {
  const data = getProductRuntimeStatus();
  return (
    <ProductRuntimePage
      tag="TRADING PRO MAX"
      title="Workspace"
      subtitle={`Cycle: ${data.runtime.cycle} · Workspaces: ${data.metrics.workspaces}`}
      metrics={data.metrics}
      items={["Workspace shell", "Context switching", "Team access", "Views", "Pinned flows", "Controls"]}
    />
  );
}
