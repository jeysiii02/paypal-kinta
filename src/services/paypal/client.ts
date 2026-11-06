import { AppError } from "@/lib/errors";
import { randomUUID } from "crypto";

export type PayPalMode = "live" | "mock";

export function getPayPalConfig() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ||
    "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim() ?? "";
  const baseUrl =
    process.env.PAYPAL_BASE_URL?.trim() || "https://api-m.sandbox.paypal.com";
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() ?? "";
  const currency = (process.env.PAYPAL_CURRENCY?.trim() || "PHP").toUpperCase();
  const brandName = process.env.PAYPAL_BRAND_NAME?.trim() || "KINTA";
  const returnUrl =
    process.env.PAYPAL_RETURN_URL?.trim() ||
    "http://localhost:3000/dashboard";
  const cancelUrl =
    process.env.PAYPAL_CANCEL_URL?.trim() ||
    "http://localhost:3000/dashboard";
  const forceMock = process.env.PAYPAL_MOCK === "true";
  const mode: PayPalMode =
    forceMock || !clientId || !clientSecret ? "mock" : "live";

  return {
    clientId,
    clientSecret,
    baseUrl,
    webhookId,
    currency,
    brandName,
    returnUrl,
    cancelUrl,
    mode,
  };
}

export function getPublicPayPalConfig() {
  const { clientId, mode, baseUrl, currency, brandName } = getPayPalConfig();
  return {
    clientId: mode === "mock" ? "" : clientId,
    mode,
    currency,
    brandName,
    intent: "CAPTURE" as const,
    baseUrl,
    sdkEnabled: mode === "live" && Boolean(clientId),
  };
}

export function getPayPalTechStatus() {
  const config = getPayPalConfig();
  return {
    mode: config.mode,
    currency: config.currency,
    baseUrl: config.baseUrl,
    brandName: config.brandName,
    clientIdConfigured: Boolean(config.clientId),
    clientSecretConfigured: Boolean(config.clientSecret),
    webhookIdConfigured: Boolean(config.webhookId),
    sdkReady: config.mode === "live" && Boolean(config.clientId),
    apis: [
      "Orders v2 create",
      "Orders v2 capture",
      "Orders v2 show",
      "Captures refund",
      "Webhook verify + ingest",
      "Recovery-action PayPal execute",
    ],
  };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret, baseUrl, mode } = getPayPalConfig();
  if (mode === "mock") {
    return "mock-access-token";
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw AppError.badRequest(`PayPal auth failed: ${text}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export async function paypalFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown; idempotent?: boolean },
): Promise<T> {
  const { baseUrl, mode } = getPayPalConfig();
  if (mode === "mock") {
    throw AppError.badRequest(
      "paypalFetch called in mock mode — use mock helpers instead",
    );
  }

  const token = await getPayPalAccessToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  headers.set("Prefer", "return=representation");
  if (init?.idempotent !== false && (init?.method ?? "GET").toUpperCase() !== "GET") {
    headers.set("PayPal-Request-Id", randomUUID());
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw AppError.badRequest(
      `PayPal API ${path} failed (${response.status})`,
      json,
    );
  }

  return json as T;
}

export function mockId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function pesosValueFromCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2);
}
