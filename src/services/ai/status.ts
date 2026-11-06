import { getAiProviderName, getGeminiModelName } from "@/services/ai/provider";

export function getAiTechStatus() {
  const provider = getAiProviderName();
  const model = getGeminiModelName();
  const apiKeyConfigured = Boolean(process.env.AI_API_KEY?.trim());

  return {
    provider,
    model: provider === "gemini" ? model : "heuristic-rules-engine",
    apiKeyConfigured,
    ready:
      provider === "heuristic" || (provider === "gemini" && apiKeyConfigured),
    capabilities: [
      "Business disruption analysis (structured JSON)",
      "Recovery plan generation (Cancel / Relocate / Reschedule)",
      "Never invents legal refund entitlement",
      "Never performs final money math (finance engine owns that)",
    ],
    separationOfConcerns: {
      aiOwns: ["incident extraction", "impact hypotheses", "recovery strategy text"],
      deterministicOwns: [
        "dependency classification engine",
        "scenario financial simulation (centavos)",
        "PayPal capture/refund execution",
      ],
    },
  };
}
