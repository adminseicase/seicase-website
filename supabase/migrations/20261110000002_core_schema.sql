-- =============================================================================
-- seicase · 0002 · Core tables
-- Money is stored as numeric(12,2) in Indian Rupees (INR). Razorpay amounts are
-- converted to paise (x100) only at the payment boundary.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'customer',
  is_blocked boolean not null default false,
  marketing_opt_in boolean not null default false,
  notes text, -- internal admin notes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

-- Role helpers. SECURITY DEFINER so they can read profiles without recursing
-- through RLS. STABLE so Postgres caches them per statement.
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'customer'::public.user_role);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin') and is_blocked = false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_blocked = false
  );
$$;

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text default 'Home',
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

-- ---------------------------------------------------------------------------
-- Taxonomies: categories, styles, collections
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categories_sort_idx on public.categories (sort_order);

create table if not exists public.styles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists styles_sort_idx on public.styles (sort_order);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  description text,                 -- sanitised HTML (rich text)
  category_id uuid references public.categories (id) on delete set null,
  collection_id uuid references public.collections (id) on delete set null,
  material text,
  dimensions text,                  -- human readable, e.g. "34 × 28 × 14 cm"
  width_cm numeric(6,1),
  height_cm numeric(6,1),
  depth_cm numeric(6,1),
  strap_drop_cm numeric(6,1),
  weight_g int,
  care_instructions text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  gst_rate numeric(5,2) not null default 18,
  status public.publish_status not null default 'draft',
  publish_at timestamptz,
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  is_new boolean not null default false,
  has_spin boolean not null default false, -- has a 360° image sequence
  low_stock_threshold int not null default 5,
  seo_title text,
  seo_description text,
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,
  total_sold int not null default 0,
  sort_order int not null default 0,
  search_text text generated always as (
    lower(coalesce(name, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(material, ''))
  ) stored,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_collection_idx on public.products (collection_id);
create index if not exists products_status_idx on public.products (status, publish_at);
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_flags_idx on public.products (is_trending, is_featured, is_new);
create index if not exists products_search_trgm_idx on public.products using gin (search_text extensions.gin_trgm_ops);

create table if not exists public.product_styles (
  product_id uuid not null references public.products (id) on delete cascade,
  style_id uuid not null references public.styles (id) on delete cascade,
  primary key (product_id, style_id)
);
create index if not exists product_styles_style_idx on public.product_styles (style_id);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  colour_name text not null,
  colour_hex text not null default '#9C5A33' check (colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  sku text not null unique,
  stock int not null default 0 check (stock >= 0),
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants (product_id);
create index if not exists product_variants_stock_idx on public.product_variants (stock);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  url text not null,
  alt text,
  kind text not null default 'gallery' check (kind in ('gallery', 'spin')),
  sort_order int not null default 0,
  is_primary boolean not null default false,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, kind, sort_order);
create index if not exists product_images_variant_idx on public.product_images (variant_id);

-- ---------------------------------------------------------------------------
-- Charms ("Make It Yours" add-ons)
-- ---------------------------------------------------------------------------
create table if not exists public.charms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  cost_price numeric(12,2),
  image_url text,
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence if not exists public.order_number_seq start with 12345;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SC' || nextval('public.order_number_seq')::text),
  access_token text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  phone text,
  customer_name text,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method not null default 'razorpay',
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  cod_fee numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,     -- GST included in total
  total numeric(12,2) not null default 0,
  cost_total numeric(12,2) not null default 0,    -- for gross profit
  refunded_total numeric(12,2) not null default 0,
  coupon_id uuid,
  coupon_code text,
  shipping_address jsonb not null,
  billing_address jsonb,
  customer_notes text,
  internal_notes text,
  tracking_number text,
  courier text,
  tracking_url text,
  razorpay_order_id text,
  session_id text,
  utm jsonb,
  placed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_email_idx on public.orders (lower(email));
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_razorpay_idx on public.orders (razorpay_order_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  charm_id uuid references public.charms (id) on delete set null,
  parent_item_id uuid references public.order_items (id) on delete cascade, -- charm attached to a bag
  product_name text not null,
  variant_name text,
  sku text,
  image_url text,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null,
  cost_price numeric(12,2) not null default 0,
  gst_rate numeric(5,2) not null default 18,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  note text,
  is_customer_visible boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  provider text not null default 'razorpay',
  razorpay_order_id text,
  razorpay_payment_id text unique,
  razorpay_signature text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'created', -- created | captured | failed | refunded
  method text,                             -- upi | card | netbanking | wallet | cod
  error_code text,
  error_description text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_status_idx on public.payments (status, created_at desc);
create index if not exists payments_created_at_idx on public.payments (created_at desc);

create table if not exists public.payment_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  event text,
  razorpay_event_id text unique,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  error text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payment_webhook_logs_created_idx on public.payment_webhook_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Inventory movement log
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants (id) on delete cascade,
  charm_id uuid references public.charms (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  change int not null,
  stock_after int,
  type public.movement_type not null,
  reason text,
  order_id uuid references public.orders (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index if not exists inventory_movements_created_idx on public.inventory_movements (created_at desc);

-- ---------------------------------------------------------------------------
-- Returns & exchanges
-- ---------------------------------------------------------------------------
create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique default ('RT' || floor(extract(epoch from now()))::bigint::text || lpad((floor(random() * 1000))::int::text, 3, '0')),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  order_item_ids uuid[] not null default '{}',
  type text not null default 'return' check (type in ('return', 'exchange')),
  reason text not null,
  details text,
  images text[] not null default '{}',
  status public.return_status not null default 'requested',
  refund_amount numeric(12,2),
  refund_reference text,
  restocked boolean not null default false,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists returns_order_idx on public.returns (order_id);
create index if not exists returns_user_idx on public.returns (user_id);
create index if not exists returns_status_idx on public.returns (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  description text,
  type public.discount_type not null default 'percentage',
  value numeric(12,2) not null check (value > 0),
  min_order numeric(12,2) not null default 0,
  max_discount numeric(12,2),
  usage_limit int,
  usage_count int not null default 0,
  per_customer_limit int,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  auto_apply boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coupons_active_idx on public.coupons (is_active, auto_apply);

alter table public.orders
  drop constraint if exists orders_coupon_id_fkey,
  add constraint orders_coupon_id_fkey foreign key (coupon_id) references public.coupons (id) on delete set null;
create index if not exists orders_coupon_idx on public.orders (coupon_id);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text,
  discount_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);
create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id);
create index if not exists coupon_redemptions_user_idx on public.coupon_redemptions (user_id);
create index if not exists coupon_redemptions_email_idx on public.coupon_redemptions (lower(email));

-- ---------------------------------------------------------------------------
-- Carts (server copy, used for abandoned-cart capture) & wishlists
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  email text,
  session_id text unique,
  status public.cart_status not null default 'active',
  subtotal numeric(12,2) not null default 0,
  item_count int not null default 0,
  recovery_token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  last_activity_at timestamptz not null default now(),
  abandoned_at timestamptz,
  reminder_sent_at timestamptz,
  recovered_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists carts_status_idx on public.carts (status, last_activity_at);
create index if not exists carts_email_idx on public.carts (lower(email));

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  charm_id uuid references public.charms (id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cart_items_cart_idx on public.cart_items (cart_id);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists wishlists_product_idx on public.wishlists (product_id);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  images text[] not null default '{}',
  status public.review_status not null default 'pending',
  is_verified boolean not null default false,
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_idx on public.reviews (product_id, status, created_at desc);
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

-- ---------------------------------------------------------------------------
-- CMS: hero slides, settings, pages, journal, FAQs
-- ---------------------------------------------------------------------------
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  eyebrow text,
  title text not null,
  subtitle text,
  cta_label text default 'Explore Collection',
  cta_href text default '/shop',
  image_url text not null,
  mobile_image_url text,
  alt text,
  text_tone text not null default 'dark' check (text_tone in ('dark', 'light')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  content text not null default '', -- sanitised HTML
  hero_image text,
  seo_title text,
  seo_description text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  cover_image text,
  author text default 'The seicase Studio',
  tags text[] not null default '{}',
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_posts_status_idx on public.journal_posts (status, published_at desc);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'General',
  sort_order int not null default 0,
  is_popular boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists faqs_sort_idx on public.faqs (category, sort_order);

-- ---------------------------------------------------------------------------
-- Inbound: contact messages and newsletter
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  is_read boolean not null default false,
  replied_at timestamptz,
  reply_body text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages (is_read, created_at desc);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'footer',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists newsletter_created_idx on public.newsletter_subscribers (created_at desc);

-- ---------------------------------------------------------------------------
-- Analytics events (first-party)
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in (
    'page_view', 'product_view', 'search', 'add_to_cart', 'remove_from_cart',
    'add_to_wishlist', 'begin_checkout', 'payment_initiated', 'purchase',
    'payment_failed', 'newsletter_signup', 'contact_submit'
  )),
  session_id text not null,
  user_id uuid,
  product_id uuid,
  order_id uuid,
  path text,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  device_type text,
  browser text,
  os text,
  country text,
  region text,
  city text,
  search_query text,
  results_count int,
  value numeric(12,2),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_name_created_idx on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, created_at);
create index if not exists analytics_events_product_idx on public.analytics_events (product_id, event_name) where product_id is not null;

-- ---------------------------------------------------------------------------
-- Audit log and rate limiting
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,       -- e.g. product.update
  entity text not null,       -- e.g. product
  entity_id text,
  summary text,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity, entity_id);

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'addresses', 'categories', 'styles', 'collections', 'products',
    'product_variants', 'charms', 'orders', 'payments', 'returns', 'coupons',
    'carts', 'reviews', 'hero_slides', 'pages', 'journal_posts', 'faqs'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;
