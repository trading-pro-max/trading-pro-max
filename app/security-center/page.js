import { SurfacePage } from "../_components/SurfacePage";

export default function SecurityCenterPage() {
  return (
    <SurfacePage
      tag="TRADING PRO MAX"
      title="Security Center"
      subtitle="Security hardening and controls surface."
      items={["Policies", "Guards", "Rate limits", "Audit", "Rotation", "Incident response"]}
    />
  );
}
