import { JournalVaultWorkspace } from "../_components/JournalVaultWorkspace";
import { ProductModulePage } from "../_components/ProductModulePage";
import { getJournalVaultData, getSharedTradingProductData } from "../_components/product-data";
import { getCoreModuleByHref } from "../_components/product-modules";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Journal Vault",
  description: "Session memory and trade logging workspace for Trading Pro Max."
};

export default function Page() {
  const data = getJournalVaultData();
  const sharedData = getSharedTradingProductData();
  const module = getCoreModuleByHref("/journal-vault");

  return (
    <ProductModulePage
      module={module}
      title="Journal Vault"
      subtitle="Canonical journal and replay surface for session memory, execution notes, operator clarity, and reviewable trading history."
      actions={[
        { href: "/risk-control", label: "Review Risk Context" },
        { href: "/execution-center", label: "Open Execution Center", primary: true }
      ]}
      stats={[
        { label: "Status", value: data.journal.status || "ACTIVE", hint: data.journal.title || "Journal runtime" },
        { label: "Tracked Logs", value: String(data.metrics?.trackedLogs ?? 0), hint: "Persisted journal coverage" },
        { label: "Replayable", value: String(data.metrics?.replayableEntries ?? 0), hint: "Entries ready for review" },
        { label: "Clarity", value: String(data.metrics?.operatorClarity ?? 0), hint: "Operator readability score" }
      ]}
      metrics={[
        { label: "Replay Focus", value: data.tracks[0]?.title || "Session Review", hint: "Highest-priority review stream", tone: "success" },
        { label: "Review Depth", value: String(Object.keys(data.metrics || {}).length), hint: "Tracked metric categories", tone: "info" },
        { label: "Memory Bias", value: "Structured", hint: "Built for deliberate post-trade review", tone: "neutral" }
      ]}
      sections={[
        {
          title: "Connected Journal Workspace",
          subtitle: "Shared session notes, route context, and recent activity for the active product session",
          content: <JournalVaultWorkspace data={sharedData} />
        }
      ]}
    />
  );
}
