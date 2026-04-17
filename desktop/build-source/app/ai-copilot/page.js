import { AiCopilotWorkspace } from "../_components/AiCopilotWorkspace";
import { ProductModulePage } from "../_components/ProductModulePage";
import { getAiCopilotData, getSharedTradingProductData } from "../_components/product-data";
import { getCoreModuleByHref } from "../_components/product-modules";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "AI Copilot",
  description: "Operator guidance workspace for Trading Pro Max."
};

export default function Page() {
  const data = getAiCopilotData();
  const sharedData = getSharedTradingProductData();
  const module = getCoreModuleByHref("/ai-copilot");

  return (
    <ProductModulePage
      module={module}
      title="AI Copilot"
      subtitle="A product-facing copilot surface for trader summaries, route explanations, workflow guidance, and operator handoff support."
      actions={[
        { href: "/market-intelligence", label: "Review Market Context" },
        { href: "/strategy-lab", label: "Open Strategy Lab", primary: true }
      ]}
      stats={[
        { label: "AI Workflows", value: String(data.workflows), hint: "Local product runtime" },
        { label: "Prompt Packs", value: String(data.prompts.length), hint: "Suggested copilot tasks" },
        { label: "Handoff Items", value: String(data.highlights.length), hint: "Recent product events" },
        { label: "Role", value: "SESSION SUPPORT", hint: "Trader-facing guidance" }
      ]}
      metrics={[
        { label: "Copilot Mode", value: "Trader", hint: "Oriented around operator comprehension", tone: "info" },
        { label: "Context Depth", value: String(data.highlights.length), hint: "Events available for grounding", tone: "success" },
        { label: "Prompt Bias", value: "Actionable", hint: "Focused on handoff and review", tone: "neutral" }
      ]}
      sections={[
        {
          title: "Connected Copilot Workspace",
          subtitle: "Shared route, risk, and execution guidance for the active operating context",
          content: <AiCopilotWorkspace data={sharedData} prompts={data.prompts} />
        }
      ]}
    />
  );
}
