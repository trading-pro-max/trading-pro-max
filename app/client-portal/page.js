import { SurfacePage } from "../_components/SurfacePage";

export default function ClientPortalPage() {
  return (
    <SurfacePage
      tag="TRADING PRO MAX"
      title="Client Portal"
      subtitle="Client-facing trading and account surface."
      items={["Overview", "Accounts", "Performance", "Activity", "Settings", "Support"]}
    />
  );
}
