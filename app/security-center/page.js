import { getLaunchRuntimeStatus } from "../../lib/tpm-launch-runtime.mjs";
import { LaunchRuntimePage } from "../_components/LaunchRuntimePage";

export const dynamic = "force-dynamic";

export default function SecurityCenterPage() {
  const data = getLaunchRuntimeStatus();
  return (
    <LaunchRuntimePage
      title="Security Center"
      subtitle={`Cycle: ${data.runtime.cycle} · Security Score: ${data.metrics.securityScore}`}
      metrics={data.metrics}
      items={["Policies", "Guards", "Rate limits", "Audit", "Rotation", "Incident response"]}
    />
  );
}
