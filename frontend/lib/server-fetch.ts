import { cookies } from "next/headers";

const FLASK_ORIGIN = process.env.FLASK_ORIGIN || "http://127.0.0.1:5000";

/**
 * Server Component fetch helper. Server Components run in the Next.js Node
 * process, so a plain fetch() never goes through next.config.ts rewrites (those
 * only apply to requests the browser sends to the Next server) and never carries
 * the browser's cookies automatically — both have to be done by hand here.
 */
export async function serverFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const res = await fetch(`${FLASK_ORIGIN}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`serverFetch ${path} failed with ${res.status}`);
  }
  return res.json();
}
