import { serverFetch } from "@/lib/server-fetch";
import type { WishlistData } from "@/lib/types";
import WishlistView from "@/components/WishlistView";

export default async function WishlistPage() {
  const initialData = await serverFetch<WishlistData>("/api/wishlist-data");
  return <WishlistView initialData={initialData} />;
}
