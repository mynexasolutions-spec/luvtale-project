import Link from "next/link";
import { notFound } from "next/navigation";
import "./product-detail.css";
import { publicFetch } from "@/lib/public-fetch";
import type { ProductCard as ProductCardType, ProductDetail, Review } from "@/lib/types";
import ProductDetailView from "@/components/ProductDetailView";
import ShopProductCard from "@/components/ShopProductCard";

interface ProductDetailData {
  product: ProductDetail;
  reviews: Review[];
  related_products: ProductCardType[];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let data: ProductDetailData;
  try {
    data = await publicFetch<ProductDetailData>(`/api/product-detail/${encodeURIComponent(slug)}`, 60);
  } catch {
    notFound();
  }

  const { product, reviews, related_products } = data;

  return (
    <div className="product-page-wrap">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <div className="breadcrumb-container">
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right separator"></i>
          <Link href="/shop">Shop</Link>
          {product.category_id && (
            <>
              <i className="fas fa-chevron-right separator"></i>
              <Link href={`/shop?category=${product.category_id}`}>{product.category_name}</Link>
            </>
          )}
          <i className="fas fa-chevron-right separator"></i>
          <span className="current">{product.name}</span>
        </div>
      </nav>

      <ProductDetailView product={product} reviews={reviews} />

      {related_products.length > 0 && (
        <div className="related-products-section reveal">
          <h2 className="section-heading">You May Also Like</h2>
          <div className="related-grid">
            {related_products.map((rp) => (
              <ShopProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
