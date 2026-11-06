import { AppError } from "@/lib/errors";

export type PayPalMode = "live" | "mock";

export function getPayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim() ?? "";
  const baseUrl =
    process.env.PAYPAL_BASE_URL?.trim() || "https://api-m.sandbox.paypal.com";
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() ?? "";
  const forceMock = process.env.PAYPAL_MOCK === "true";
  const mode: PayPalMode =
    forceMock || !clientId || !clientSecret ? "mock" : "live";

  return { clientId, clientSecret, baseUrl, webhookId, mode };
}

export function getPublicPayPalConfig() {
  const { clientId, mode, baseUrl } = getPayPalConfig();
  return {
    clientId: mode === "mock" ? "mock-client-id" : clientId,
    mode,
    currency: "PHP",
    intent: "CAPTURE" as const,
    baseUrl,
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
  init?: RequestInit & { json?: unknown },
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
