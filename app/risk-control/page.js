import { ProductModulePage } from "../_components/ProductModulePage";
import { RiskControlWorkspace } from "../_components/RiskControlWorkspace";
import { getProductRuntime, getRiskControlData, getSharedTradingProductData } from "../_components/product-data";
import { getCoreModuleByHref } from "../_components/product-modules";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Risk Control",
  description: "Protection console and shared risk workspace for Trading Pro Max."
};

export default function Page() {
  const data = getRiskControlData();
  const sharedData = getSharedTradingProductData();
  const runtime = getProductRuntime();
  const module = getCoreModuleByHref("/risk-control");

  return (
    <ProductModulePage
      module={module}
      title="Risk Control"
      subtitle="Capital protection, validation posture, and freeze-capable operating controls live here as a dedicated canonical module."
      actions={[
        { href: "/execution-center", label: "Return To Execution", primary: true },
        { href: "/journal-vault", label: "Open Journal Vault" }
      ]}
      stats={[
        { label: "Risk Guards", value: String(runtime.metrics?.riskGuards ?? 0), hint: "Active protection layers" },
        { label: "Lanes", value: String(data.lanes.length), hint: "Runtime guard lanes" },
        { label: "Protection State", value: "ARMED", hint: "Manual and automatic controls" },
        { label: "Session Posture", value: "PROTECTED", hint: "Risk-first default" }
      ]}
      metrics={[
        { label: "Freeze Ready", value: "Yes", hint: "Manual intervention path is available", tone: "danger" },
        { label: "Guard Focus", value: data.lanes[0]?.title || "Capital Controls", hint: "Highest-priority lane", tone: "success" },
        { label: "Default Bias", value: "Protect", hint: "Risk posture overrides growth posture", tone: "warning" }
      ]}
      sections={[
        {
          title: "Connected Risk Workspace",
          subtitle: "Shared route context, protection posture, and operator risk controls",
          content: <RiskControlWorkspace data={{ ...sharedData, lanes: data.lanes }} />
        }
      ]}
    />
  );
}
