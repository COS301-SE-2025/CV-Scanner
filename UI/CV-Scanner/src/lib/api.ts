export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

function buildHeaders(init?: RequestInit) {
  const hdrs: Record<string, string> =
    init && init.headers && !(init.headers instanceof Headers)
      ? (init.headers as Record<string, string>)
      : {};
  // if body is FormData, let the browser set Content-Type
  if (init && (init as any).body instanceof FormData) {
    delete hdrs["Content-Type"];
  } else {
    hdrs["Content-Type"] = hdrs["Content-Type"] ?? "application/json";
  }
  return new Headers(hdrs);
}

export const apiFetch = (path: string, init: RequestInit = {}) =>
  fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
  });

export const aiFetch = async (path: string, init: RequestInit = {}) => {
  const AI_BASE = (import.meta.env.VITE_AI_BASE_URL ?? API_BASE_URL).replace(
    /\/+$/,
    ""
  );
  const apiBase = API_BASE_URL.replace(/\/+$/, "");

  const join = (base: string, p: string) =>
    base + (p.startsWith("/") ? p : "/" + p);

  // Try in order: configured AI base, apiBase + /ai, apiBase (plain)
  const candidates = [
    join(AI_BASE, path),
    join(apiBase, `/ai${path.startsWith("/") ? path : "/" + path}`),
    join(apiBase, path),
  ];

  // Ensure headers applied consistently
  const finalInit = {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
  };

  for (const url of candidates) {
    try {
      const res = await fetch(url, finalInit);
      // If found or server error, return immediately. Only continue on 404.
      if (res.status !== 404) return res;
    } catch (e) {
      // network error -> try next
    }
  }

  // Last attempt: call the primary AI_BASE even if it returned 404 earlier
  return fetch(join(AI_BASE, path), finalInit);
};
