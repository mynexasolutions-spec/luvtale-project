const FLASK_ORIGIN = process.env.FLASK_ORIGIN || "http://127.0.0.1:5000";

/**
 * Server-side fetch for data that's the same for every visitor (product catalog,
 * categories, home feed). No cookies are forwarded, so Next.js can cache and reuse
 * the response across requests (ISR) instead of hitting Flask every time.
 */
export async function publicFetch<T = unknown>(path: string, revalidateSeconds = 60): Promise<T> {
  const res = await fetch(`${FLASK_ORIGIN}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`publicFetch ${path} failed with ${res.status}`);
  }
  return res.json();
}
