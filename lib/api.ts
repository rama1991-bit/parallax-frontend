export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SESSION_STORAGE_KEY = "parallax_session_id";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const sessionId = createSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

function sessionHeaders(): Record<string, string> {
  const sessionId = getSessionId();
  return sessionId ? { "X-Parallax-Session-Id": sessionId } : {};
}

async function getErrorMessage(res: Response) {
  const text = await res.text();
  if (!text) return `Request failed with status ${res.status}`;

  try {
    const data = JSON.parse(text);
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.detail?.message === "string") return data.detail.message;
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((item: any) => item?.msg || item?.message || "Invalid input")
        .join(", ");
    }
    if (typeof data?.message === "string") return data.message;
  } catch {
    return text;
  }

  return text;
}

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: sessionHeaders(),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  return res.json();
}

export async function apiText(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: sessionHeaders(),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  return res.text();
}

export async function apiPost(path: string, body: unknown = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  return res.json();
}
