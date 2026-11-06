import type { ApiResult } from "@/lib/types";

export class ClientApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ClientApiError";
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = path.startsWith("http") ? new URL(path) : new URL(path, "http://local");
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return path.startsWith("http")
    ? url.toString()
    : `${url.pathname}${url.search}`;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = options.body || options.formData ? "POST" : "GET", body, formData, query } =
    options;

  const headers: HeadersInit = {};
  let payload: BodyInit | undefined;

  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: payload,
    cache: "no-store",
  });

  let json: ApiResult<T> | null = null;
  try {
    json = (await response.json()) as ApiResult<T>;
  } catch {
    throw new ClientApiError(
      "INTERNAL_ERROR",
      `Request failed (${response.status}) with non-JSON body`,
    );
  }

  if (!json || !("success" in json)) {
    throw new ClientApiError("INTERNAL_ERROR", "Malformed API response");
  }

  if (!json.success) {
    throw new ClientApiError(json.error.code, json.error.message, json.error.details);
  }

  return json.data;
}
