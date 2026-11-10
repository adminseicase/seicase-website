-- =============================================================================
-- seicase · 0004 · Row Level Security
--   public    → published catalogue + public content only
--   customer  → their own profile, addresses, wishlist, carts, orders, returns
--   staff     → everything (admin-only bits are checked with is_admin())
-- The service role (server only) bypasses RLS.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'addresses', 'categories', 'styles', 'collections', 'products',
    'product_styles', 'product_variants', 'product_images', 'charms',
    'inventory_movements', 'carts', 'cart_items', 'wishlists', 'orders',
    'order_items', 'order_status_history', 'payments', 'payment_webhook_logs',
    'returns', 'coupons', 'coupon_redemptions', 'reviews', 'hero_slides',
    'site_settings', 'pages', 'journal_posts', 'faqs', 'contact_messages',
    'newsletter_subscribers', 'analytics_events', 'audit_logs', 'rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- Staff get full access to every table via one policy
    execute format('drop policy if exists "staff full access" on public.%I', t);
    execute format(
      'create policy "staff full access" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())',
      t
    );
  end loop;
end $$;

-- Helper: is a product visible to the public right now?
create or replace function public.is_product_public(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from products
    where id = p_product_id and status = 'published' and (publish_at is null or publish_at <= now())
  );
$$;

-- ---------------------------------------------------------------------------
-- Public catalogue
-- ---------------------------------------------------------------------------
drop policy if exists "public read visible categories" on public.categories;
create policy "public read visible categories" on public.categories
  for select to anon, authenticated using (is_visible);

drop policy if exists "public read visible styles" on public.styles;
create policy "public read visible styles" on public.styles
  for select to anon, authenticated using (is_visible);

drop policy if exists "public read visible collections" on public.collections;
create policy "public read visible collections" on public.collections
  for select to anon, authenticated using (is_visible);

drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products
  for select to anon, authenticated
  using (status = 'published' and (publish_at is null or publish_at <= now()));

drop policy if exists "public read product styles" on public.product_styles;
create policy "public read product styles" on public.product_styles
  for select to anon, authenticated using (public.is_product_public(product_id));

drop policy if exists "public read variants" on public.product_variants;
create policy "public read variants" on public.product_variants
  for select to anon, authenticated using (public.is_product_public(product_id));

drop policy if exists "public read images" on public.product_images;
create policy "public read images" on public.product_images
  for select to anon, authenticated using (public.is_product_public(product_id));

drop policy if exists "public read active charms" on public.charms;
create policy "public read active charms" on public.charms
  for select to anon, authenticated using (is_active);

drop policy if exists "public read approved reviews" on public.reviews;
create policy "public read approved reviews" on public.reviews
  for select to anon, authenticated using (status = 'approved' or user_id = auth.uid());

-- Verified buyers may write one review per product (it starts as pending)
drop policy if exists "buyers create reviews" on public.reviews;
create policy "buyers create reviews" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and public.has_purchased(product_id));

-- ---------------------------------------------------------------------------
-- Public content
-- ---------------------------------------------------------------------------
drop policy if exists "public read active slides" on public.hero_slides;
create policy "public read active slides" on public.hero_slides
  for select to anon, authenticated using (is_active);

drop policy if exists "public read public settings" on public.site_settings;
create policy "public read public settings" on public.site_settings
  for select to anon, authenticated using (is_public);

drop policy if exists "public read published pages" on public.pages;
create policy "public read published pages" on public.pages
  for select to anon, authenticated using (is_published);

drop policy if exists "public read published posts" on public.journal_posts;
create policy "public read published posts" on public.journal_posts
  for select to anon, authenticated
  using (status = 'published' and (published_at is null or published_at <= now()));

drop policy if exists "public read visible faqs" on public.faqs;
create policy "public read visible faqs" on public.faqs
  for select to anon, authenticated using (is_visible);

-- ---------------------------------------------------------------------------
-- Customer-owned data
-- ---------------------------------------------------------------------------
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own addresses" on public.addresses;
create policy "own addresses" on public.addresses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own wishlist" on public.wishlists;
create policy "own wishlist" on public.wishlists
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own carts" on public.carts;
create policy "own carts" on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own cart items" on public.cart_items;
create policy "own cart items" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own order items read" on public.order_items;
create policy "own order items read" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "own order history read" on public.order_status_history;
create policy "own order history read" on public.order_status_history
  for select to authenticated
  using (is_customer_visible and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "own returns read" on public.returns;
create policy "own returns read" on public.returns
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own returns create" on public.returns;
create policy "own returns create" on public.returns
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'requested'
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'delivered')
  );

-- Customers can read coupons only through evaluate_coupon(); no direct policy.
-- contact_messages, newsletter_subscribers, analytics_events, payments,
-- payment_webhook_logs, audit_logs, rate_limits: written by the server with
-- the service role; readable by staff only (policy above).

-- Only admins (not staff) may change site settings, coupons and roles.
drop policy if exists "staff full access" on public.site_settings;
create policy "staff read settings" on public.site_settings
  for select to authenticated using (public.is_staff());
create policy "admin write settings" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff full access" on public.audit_logs;
create policy "staff read audit" on public.audit_logs
  for select to authenticated using (public.is_staff());
