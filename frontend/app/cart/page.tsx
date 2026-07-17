import { serverFetch } from "@/lib/server-fetch";
import type { CartData } from "@/lib/types";
import CartPageView from "@/components/CartPageView";

export default async function CartPage() {
  const initialData = await serverFetch<CartData>("/api/cart-data");
  return <CartPageView initialData={initialData} />;
}
