import { loadPlatformSecrets } from "./platform";

export type ServiceStatus = {
  key: string;
  label: string;
  enabled: boolean;
  valuePreview: string | null;
};

function preview(value?: string) {
  if (!value) return null;
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function getServiceRegistry(): ServiceStatus[] {
  const secrets = loadPlatformSecrets();

  return [
    {
      key: "stripe",
      label: "Stripe",
      enabled: Boolean(secrets.STRIPE_SECRET_KEY && secrets.STRIPE_PRICE_ID),
      valuePreview: preview(secrets.STRIPE_PRICE_ID)
    },
    {
      key: "email",
      label: "Email",
      enabled: Boolean(secrets.RESEND_API_KEY || secrets.EMAIL_FROM),
      valuePreview: preview(secrets.EMAIL_FROM)
    },
    {
      key: "telegram",
      label: "Telegram",
      enabled: Boolean(secrets.TELEGRAM_BOT_TOKEN && secrets.TELEGRAM_CHAT_ID),
      valuePreview: preview(secrets.TELEGRAM_CHAT_ID)
    },
    {
      key: "github",
      label: "GitHub",
      enabled: Boolean(secrets.GITHUB_REPOSITORY_URL),
      valuePreview: preview(secrets.GITHUB_REPOSITORY_URL)
    },
    {
      key: "cloudflare",
      label: "Cloudflare Tunnel",
      enabled: Boolean(secrets.CLOUDFLARE_TUNNEL_URL),
      valuePreview: preview(secrets.CLOUDFLARE_TUNNEL_URL)
    },
    {
      key: "render",
      label: "Render",
      enabled: Boolean(secrets.RENDER_PUBLIC_URL),
      valuePreview: preview(secrets.RENDER_PUBLIC_URL)
    }
  ];
}

export function getExternalServiceConfig() {
  const secrets = loadPlatformSecrets();

  return {
    publicBaseUrl: secrets.PUBLIC_BASE_URL || "http://localhost:5173",
    apiBaseUrl: secrets.API_BASE_URL || "http://localhost:8787",
    webhookPublicUrl:
      secrets.WEBHOOK_PUBLIC_URL ||
      "http://localhost:8787/api/payments/webhook",
    supportEmail: secrets.SUPPORT_EMAIL || "support@tradingpromax.local",
    emailFrom: secrets.EMAIL_FROM || "noreply@tradingpromax.local",
    services: getServiceRegistry()
  };
}
