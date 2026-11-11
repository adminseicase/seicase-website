/**
 * Domain types shared by the storefront, admin panel and demo data.
 * Field names mirror the database columns (snake_case) so rows from Supabase
 * can be used directly without mapping.
 */

export type PublishStatus = "draft" | "published" | "archived";
export type OrderStatus = "pending" | "placed" | "confirmed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "returned";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type PaymentMethod = "razorpay" | "cod";
export type ReturnStatus = "requested" | "approved" | "rejected" | "received" | "refunded" | "exchanged";
export type UserRole = "customer" | "staff" | "admin";
export type ReviewStatus = "pending" | "approved" | "hidden";

export interface Taxonomy {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  colour_name: string;
  colour_hex: string;
  sku: string;
  stock: number;
  price_override: number | null;
  is_default: boolean;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  url: string;
  alt: string | null;
  kind: "gallery" | "spin";
  sort_order: number;
  is_primary: boolean;
  width?: number | null;
  height?: number | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  collection_id: string | null;
  material: string | null;
  dimensions: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  strap_drop_cm: number | null;
  weight_g: number | null;
  care_instructions: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  gst_rate: number;
  status: PublishStatus;
  publish_at: string | null;
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  has_spin: boolean;
  low_stock_threshold: number;
  seo_title: string | null;
  seo_description: string | null;
  rating_avg: number;
  rating_count: number;
  total_sold: number;
  sort_order: number;
  created_at: string;
}

/** Lightweight shape used by grids and carousels. */
export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  rating_avg: number;
  rating_count: number;
  is_new: boolean;
  image: string | null;
  image_alt: string;
  hover_image: string | null;
  colours: { name: string; hex: string }[];
  in_stock: boolean;
  category_slug: string | null;
  default_variant_id: string | null;
}

/** Everything the product detail page needs. */
export interface ProductDetail extends Product {
  category: Pick<Taxonomy, "id" | "name" | "slug"> | null;
  styles: Pick<Taxonomy, "id" | "name" | "slug">[];
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface Charm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  sort_order: number;
}

export interface Review {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  status: ReviewStatus;
  is_verified: boolean;
  admin_reply: string | null;
  created_at: string;
}

export interface HeroSlide {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string;
  mobile_image_url: string | null;
  alt: string | null;
  text_tone: "dark" | "light";
  sort_order: number;
  is_active: boolean;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_popular: boolean;
  is_visible: boolean;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  hero_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  updated_at: string;
}

export interface JournalPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string | null;
  tags: string[];
  status: PublishStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at?: string;
}

export interface Address {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface SavedAddress extends Address {
  id: string;
  label: string | null;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  charm_id: string | null;
  parent_item_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  phone: string | null;
  customer_name: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  cod_fee: number;
  tax_total: number;
  total: number;
  coupon_code: string | null;
  shipping_address: Address;
  billing_address: Address | null;
  tracking_number: string | null;
  courier: string | null;
  tracking_url: string | null;
  created_at: string;
  placed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  order_status_history?: { id: string; status: OrderStatus; note: string | null; created_at: string }[];
}

/* ---------------------------- Site settings ---------------------------- */

export interface AnnouncementSettings {
  enabled: boolean;
  messages: string[];
  link: string | null;
}

export interface StoreSettings {
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  hours: string;
  gstin: string | null;
  map_lat: number;
  map_lng: number;
}

export interface ShippingSettings {
  free_threshold: number;
  flat_rate: number;
  cod_enabled: boolean;
  cod_fee: number;
  cod_max_order: number;
  return_window_days: number;
  metro_days: string;
  standard_days: string;
}

export interface SocialSettings {
  instagram: string | null;
  pinterest: string | null;
  youtube: string | null;
  facebook: string | null;
}

export type HomepageSectionId = "hero" | "trust" | "categories" | "crafted" | "trending" | "styles" | "lifestyle" | "newsletter";

export interface HomepageSettings {
  sections: { id: HomepageSectionId; visible: boolean }[];
}

export interface TrustItem {
  icon: "leather" | "design" | "shipping" | "returns" | "secure";
  title: string;
  subtitle: string;
}

export interface BannerSettings {
  crafted: {
    title: string;
    body: string;
    link_label: string;
    link_href: string;
    image: string;
    video_url: string | null;
    video_poster: string;
    video_label: string;
  };
  lifestyle: {
    title: string;
    body: string;
    cta_label: string;
    cta_href: string;
    image: string;
  };
  newsletter: { title: string; body: string };
}

export interface SiteSettings {
  announcement: AnnouncementSettings;
  store: StoreSettings;
  shipping: ShippingSettings;
  social: SocialSettings;
  homepage: HomepageSettings;
  trust_strip: { items: TrustItem[] };
  banners: BannerSettings;
}

/* ------------------------------- Cart ------------------------------- */

export interface CartLine {
  /** variantId + optional charmId — unique per line */
  key: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  colour: string;
  image: string | null;
  price: number;
  quantity: number;
  charm?: { id: string; name: string; price: number; image: string | null } | null;
}
