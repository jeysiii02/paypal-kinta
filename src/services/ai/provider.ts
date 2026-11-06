import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppError } from "@/lib/errors";

export type AiProviderName = "gemini" | "heuristic";

export function getAiProviderName(): AiProviderName {
  const raw = (process.env.AI_PROVIDER ?? "gemini").toLowerCase().trim();
  if (raw === "heuristic") return "heuristic";
  return "gemini";
}

export function getGeminiModelName() {
  return process.env.AI_MODEL?.trim() || "gemini-2.0-flash";
}

/**
 * Call Gemini with a prompt and expect a JSON object response.
 * Throws if AI_API_KEY is missing — never returns fabricated success.
 */
export async function generateJsonWithGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    throw AppError.badRequest(
      "AI_API_KEY is not configured. Set AI_API_KEY in .env, or set AI_PROVIDER=heuristic for offline deterministic extraction.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModelName(),
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Sometimes models wrap JSON in fences despite mime type
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw AppError.badRequest(
        "AI provider returned non-JSON output. Retry or check model configuration.",
        { preview: text.slice(0, 400) },
      );
    }
    return JSON.parse(match[0]) as unknown;
  }
}
