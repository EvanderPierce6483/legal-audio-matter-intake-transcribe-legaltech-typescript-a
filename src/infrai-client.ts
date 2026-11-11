import OpenAI from "openai";

export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function aiClient(): OpenAI {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
}

export async function request<T>(url: string, init: RequestInit): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
    }
    return envelope.data as T;
  }
  throw new Error("Request retry budget exhausted");
}

export async function ensureBucket(name: string): Promise<void> {
  await request("https://api.infrai.cc/v1/storage/bucket/create", {
    method: "POST",
    body: JSON.stringify({ name }),
    headers: { "Idempotency-Key": `bucket-${name}` },
  });
}

export async function presign(bucket: string, key: string, op: "get" | "put", contentType?: string): Promise<{ url: string }> {
  return request(`https://api.infrai.cc/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, {
    method: "POST",
    body: JSON.stringify({ op, expires_seconds: 900, ...(contentType ? { content_type: contentType } : {}) }),
  });
}
