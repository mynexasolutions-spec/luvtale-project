import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-fetch";
import type { User } from "@/lib/types";
import LoginSignupView from "@/components/LoginSignupView";

// Must be browser-reachable (this becomes the redirect's Location header), unlike
// FLASK_ORIGIN which is only used for server-to-server calls.
const PUBLIC_FLASK_ORIGIN = process.env.NEXT_PUBLIC_FLASK_ORIGIN || "http://127.0.0.1:5000";

export default async function LoginPage() {
  const { user } = await serverFetch<{ user: User | null }>("/api/auth/session");
  if (user) {
    if (user.role === "admin") {
      redirect(`${PUBLIC_FLASK_ORIGIN}/admin`);
    }
    redirect("/profile");
  }
  return <LoginSignupView />;
}
