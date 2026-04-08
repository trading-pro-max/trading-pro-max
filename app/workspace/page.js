import { SurfacePage } from "../_components/SurfacePage";

export default function WorkspacePage() {
  return (
    <SurfacePage
      tag="TRADING PRO MAX"
      title="Workspace"
      subtitle="Multi-workspace operating surface."
      items={["Workspace shell", "Context switching", "Team access", "Views", "Pinned flows", "Controls"]}
    />
  );
}
