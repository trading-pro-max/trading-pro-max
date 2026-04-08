import { getLaunchRuntimeStatus } from "../../lib/tpm-launch-runtime.mjs";
import { LaunchRuntimePage } from "../_components/LaunchRuntimePage";

export const dynamic = "force-dynamic";

export default function LaunchReadinessPage() {
  const data = getLaunchRuntimeStatus();
  return (
    <LaunchRuntimePage
      title="Launch Readiness"
      subtitle={`Cycle: ${data.runtime.cycle} · Verdict: ${data.runtime.verdict}`}
      metrics={data.metrics}
      items={["Readiness score", "Smoke tests", "Load tests", "Checklist", "Rollback", "Promotion gate"]}
    />
  );
}
