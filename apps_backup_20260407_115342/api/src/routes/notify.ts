import { Router } from "express";
import { getNotificationStatus, sendTelegramMessage } from "../lib/notify";

export const notifyRouter = Router();

notifyRouter.get("/status", (_req, res) => {
  res.json({ ok: true, ...getNotificationStatus() });
});

notifyRouter.post("/test", async (_req, res) => {
  try {
    await sendTelegramMessage(`Trading Pro Max live test alert\n${new Date().toISOString()}`);
    res.json({ ok: true, sent: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Telegram test failed" });
  }
});
