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

export const aiFetch = (path: string, init: RequestInit = {}) => {
  const AI_BASE = import.meta.env.VITE_AI_BASE_URL ?? API_BASE_URL;
  return fetch(`${AI_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
  });
};
