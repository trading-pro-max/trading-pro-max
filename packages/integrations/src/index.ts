export interface BrokerAdapter {
  id: string;
  name: string;
  mode: "paper" | "live";
  status: "connected" | "disconnected" | "planned";
}

export interface NotificationChannel {
  id: string;
  type: "email" | "telegram" | "push";
  status: "active" | "inactive" | "planned";
}

export const brokerAdapters: BrokerAdapter[] = [
  { id: "paper-core", name: "Paper Core", mode: "paper", status: "connected" },
  { id: "broker-live-01", name: "Broker Live 01", mode: "live", status: "planned" }
];

export const notificationChannels: NotificationChannel[] = [
  { id: "email-primary", type: "email", status: "planned" },
  { id: "telegram-ops", type: "telegram", status: "planned" },
  { id: "push-mobile", type: "push", status: "planned" }
];
