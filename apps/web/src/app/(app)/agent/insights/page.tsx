import { redirect } from "next/navigation";

export default function LegacyAgentInsightsPage() {
  redirect("/settings/ai/usage");
}
