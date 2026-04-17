import { TradingTerminal } from "./_components/TradingTerminal";
import { getTradingTerminalBootstrap } from "../lib/terminal/desk-service.js";

export const metadata = {
  title: "Terminal",
  description: "Professional trading terminal workspace for Trading Pro Max."
};

export default async function Page() {
  const data = await getTradingTerminalBootstrap();

  return <TradingTerminal data={data} />;
}
