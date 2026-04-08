import { SurfacePage } from "../_components/SurfacePage";

export default function IdentityPage() {
  return (
    <SurfacePage
      tag="TRADING PRO MAX"
      title="Identity"
      subtitle="Identity, permissions, and account access surface."
      items={["Access model", "Roles", "Sessions", "Permissions", "Recovery", "Audit trail"]}
    />
  );
}
