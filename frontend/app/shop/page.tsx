import { publicFetch } from "@/lib/public-fetch";
import type { Category, ProductCard as ProductCardType } from "@/lib/types";
import { MobileShopFilters, DesktopShopSidebar } from "@/components/ShopFilters";
import ProductCard from "@/components/ProductCard";

interface ShopData {
  products: ProductCardType[];
  category_ids: number[];
  subcategory_ids: number[];
}

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  toArray(params.category).forEach((v) => qs.append("category", v));
  toArray(params.subcategory).forEach((v) => qs.append("subcategory", v));
  toArray(params.collection).forEach((v) => qs.append("collection", v));
  if (typeof params.min_price === "string") qs.set("min_price", params.min_price);
  if (typeof params.max_price === "string") qs.set("max_price", params.max_price);
  if (typeof params.sort === "string") qs.set("sort", params.sort);

  const [shop, categories] = await Promise.all([
    publicFetch<ShopData>(`/api/shop?${qs.toString()}`, 30),
    publicFetch<Category[]>("/api/categories"),
  ]);

  return (
    <div className="shop-page-wrap">
      <MobileShopFilters categories={categories} />
      <div className="shop-container">
        <DesktopShopSidebar categories={categories} />
        <main>
          <div className="section-header-row">
            <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Showing {shop.products.length} products</p>
          </div>
          <div className="products-grid">
            {shop.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
