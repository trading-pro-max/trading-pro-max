export function getNotificationStatus() {
  return {
    telegram: {
      connected: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      chatIdPreview: process.env.TELEGRAM_CHAT_ID ? `${process.env.TELEGRAM_CHAT_ID.slice(0,4)}...${process.env.TELEGRAM_CHAT_ID.slice(-2)}` : null
    }
  };
}
export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram is not configured");
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  const d = await r.json();
  if (!r.ok || !d?.ok) throw new Error(d?.description || "Telegram send failed");
  return d;
}
