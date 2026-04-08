import { SurfacePage } from "../_components/SurfacePage";

export default function BillingPage() {
  return (
    <SurfacePage
      tag="TRADING PRO MAX"
      title="Billing"
      subtitle="Plans, subscriptions, and commercial surface."
      items={["Plans", "Subscription state", "Invoices", "Payment methods", "Upgrades", "Entitlements"]}
    />
  );
}
