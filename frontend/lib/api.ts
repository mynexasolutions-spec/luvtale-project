import { getCsrfToken } from "./csrf";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Client-side fetch wrapper for /api/* calls. Relative paths are routed through
 * the Next.js dev/prod server, which rewrites them to Flask (same-origin from the
 * browser's perspective, so the Flask session cookie just works).
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (MUTATING.has(method)) {
    headers.set("X-CSRFToken", getCsrfToken());
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };

  if (!res.ok) {
    throw new Error((data as { message?: string }).message || `Request to ${path} failed`);
  }
  return data;
}
