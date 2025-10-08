export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

// Use deployed AI service by default
const AI_BASE_URL = (
  import.meta.env.VITE_AI_BASE_URL ??
  "https://cv-scanner-ai-cee2d5g9epb0hcg6.southafricanorth-01.azurewebsites.net"
).replace(/\/+$/, "");

function buildHeaders(init?: RequestInit): HeadersInit {
  const body = (init as any)?.body;
  // If body is FormData, preserve provided headers but do NOT set Content-Type
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return { ...((init as any)?.headers || {}) };
  }
  return {
    "Content-Type": "application/json",
    ...((init as any)?.headers || {}),
  };
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const BASE = API_BASE_URL.replace(/\/+$/, "");
  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const isFormData =
    typeof FormData !== "undefined" && (opts as any).body instanceof FormData;

  // build headers but do NOT set Content-Type for FormData
  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((opts.headers as HeadersInit) || {}),
  };

  // Attach bearer token if present
  try {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {}

  const res = await fetch(url, { credentials: "include", ...opts, headers });
  return res;
}

export const aiFetch = async (path: string, init: RequestInit = {}) => {
  const apiBase = API_BASE_URL.replace(/\/+$/, "");

  const join = (base: string, p: string) =>
    base + (p.startsWith("/") ? p : "/" + p);

  const candidates = [
    join(AI_BASE_URL, path),
    join(apiBase, `/ai${path.startsWith("/") ? path : "/" + path}`),
    join(apiBase, path),
  ];

  const headers = buildHeaders(init);
  const finalInit: RequestInit = {
    credentials: "include",
    ...init,
    ...(headers ? { headers } : {}),
  };

  for (const url of candidates) {
    try {
      const res = await fetch(url, finalInit);
      // try next only on 404 or network error; otherwise return response (including 4xx/5xx)
      if (res.status !== 404) return res;
    } catch {
      // network error -> try next candidate
    }
  }

  // final fallback
  return fetch(join(AI_BASE_URL, path), finalInit);
};
