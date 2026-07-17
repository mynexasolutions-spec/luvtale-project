import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-fetch";
import { publicFetch } from "@/lib/public-fetch";
import type { Category, ProfileData } from "@/lib/types";
import ProfileView from "@/components/ProfileView";

export default async function ProfilePage() {
  let initialData: ProfileData;
  try {
    initialData = await serverFetch<ProfileData>("/api/auth/profile");
  } catch {
    redirect("/login");
  }
  const categories = await publicFetch<Category[]>("/api/categories");

  return <ProfileView initialData={initialData} categories={categories} />;
}
