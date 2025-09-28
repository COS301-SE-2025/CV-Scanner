export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

function buildHeaders(init?: RequestInit): HeadersInit | undefined {
  // if body is FormData, let the browser set Content-Type
  if (init && (init as any).body instanceof FormData) {
    delete (init as any).headers["Content-Type"];
  }
  // If the body is FormData, do not set Content-Type (browser must set boundary)
  const body = (init as any)?.body;
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    // preserve any provided headers but do not set Content-Type
    return (init as any)?.headers;
  }
  return {
    "Content-Type": "application/json",
    ...((init as any)?.headers || {}),
  };
}

export const apiFetch = (path: string, init: RequestInit = {}) => {
  const headers = buildHeaders(init);
  const finalInit: RequestInit = {
    credentials: "include",
    ...init,
    ...(headers ? { headers } : {}),
  };
  return fetch(`${API_BASE_URL}${path}`, finalInit);
};

export const aiFetch = async (path: string, init: RequestInit = {}) => {
  const AI_BASE = (import.meta.env.VITE_AI_BASE_URL ?? API_BASE_URL).replace(
    /\/+$/,
    ""
  );
  const apiBase = API_BASE_URL.replace(/\/+$/, "");

  const join = (base: string, p: string) =>
    base + (p.startsWith("/") ? p : "/" + p);

  const candidates = [
    join(AI_BASE, path),
    join(apiBase, `/ai${path.startsWith("/") ? path : "/" + path}`),
    join(apiBase, path),
  ];

  // ensure finalInit is typed as RequestInit to satisfy fetch overloads
  const headers = buildHeaders(init);
  const finalInit: RequestInit = {
    credentials: "include",
    ...init,
    ...(headers ? { headers } : {}),
  };

  for (const url of candidates) {
    try {
      const res = await fetch(url, finalInit);
      if (res.status !== 404) return res;
    } catch {
      // try next candidate
    }
  }

  return fetch(join(AI_BASE, path), finalInit);
};
