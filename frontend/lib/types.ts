export interface SubCategory {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  img: string | null;
  bg: string | null;
  items_count: number;
  is_hot: boolean;
  is_new: boolean;
  subcategories: SubCategory[];
}

export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  price: number;
  old_price: number | null;
  badge: string | null;
  img_primary: string | null;
  img_secondary: string | null;
  rating: number;
  stock_status: string;
  category_name: string | null;
}

export interface VariationOption {
  attribute_id: number;
  attribute: string;
  attribute_value_id: number;
  value: string;
}

export interface ProductVariation {
  id: number;
  price: number | null;
  stock_count: number;
  stock_status: string;
  sku: string | null;
  img_primary: string | null;
  images: string[];
  options: VariationOption[];
}

export interface ProductAttributeOption {
  id: number;
  name: string;
  values: { id: number; value: string }[];
}

export interface ProductDetail extends ProductCard {
  description_html: string;
  product_type: "simple" | "variable";
  stock_count: number;
  size_chart: string | null;
  category_id: number | null;
  images: string[];
  variations: ProductVariation[];
  attributes: ProductAttributeOption[];
}

export interface Review {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
  email: string;
  phone: string;
  address: string;
}

export interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  date: string;
  payment_method: string;
  return_exchange_type: string | null;
  return_exchange_reason: string | null;
  return_exchange_status: string | null;
}

export interface ProfileData {
  user: User;
  orders: Order[];
}

export interface UserProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  old_price: number | null;
  img_primary: string | null;
  description: string | null;
  category_id: number | null;
  category_name: string;
  stock_count: number;
  is_featured: boolean;
  is_trending: boolean;
  is_bestseller: boolean;
  badge: string | null;
}

export interface CartItem {
  id: number;
  variation_id: number | null;
  name: string;
  price: number;
  img: string | null;
  quantity: number;
  slug: string;
}

export interface CartData {
  cart: Record<string, CartItem>;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping_charge: number;
  shipping_threshold: number;
  total: number;
  count: number;
  user_data: { email: string; phone: string; address: string } | null;
}

export interface WishlistItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  img: string | null;
  category_name: string | null;
}

export interface WishlistData {
  wishlist: WishlistItem[];
  count: number;
}
