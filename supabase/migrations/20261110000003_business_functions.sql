-- =============================================================================
-- seicase · 0003 · Business logic in Postgres
--  * new-user profile creation and guest-order linking
--  * role-escalation guard
--  * coupon evaluation
--  * create_order(): server-priced, atomic stock decrement (no overselling)
--  * mark_order_paid(), release_order(), adjust_stock()
--  * review rating aggregation, rate limiting
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Profiles: auto-create on signup + link guest orders once email is verified
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone')
  )
  on conflict (id) do nothing;

  if new.email_confirmed_at is not null and new.email is not null then
    update public.orders set user_id = new.id
    where user_id is null and lower(email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null and new.email is not null then
    update public.orders set user_id = new.id
    where user_id is null and lower(email) = lower(new.email);
  end if;
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- Customers may edit their own profile but never their role / block status.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service role (auth.uid() is null) and admins may change anything
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_blocked is distinct from old.is_blocked
     or new.notes is distinct from old.notes then
    raise exception 'Not allowed to change role, block status or notes';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Keep only one default address per user
create or replace function public.ensure_single_default_address()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

drop trigger if exists addresses_single_default on public.addresses;
create trigger addresses_single_default
  after insert or update of is_default on public.addresses
  for each row when (new.is_default) execute function public.ensure_single_default_address();

-- ---------------------------------------------------------------------------
-- Settings helper
-- ---------------------------------------------------------------------------
create or replace function public.get_setting(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value from public.site_settings where key = p_key), '{}'::jsonb);
$$;

-- ---------------------------------------------------------------------------
-- Coupons
-- Returns one row: coupon_id (null when invalid), discount, message.
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_coupon(
  p_code text,
  p_subtotal numeric,
  p_user_id uuid default null,
  p_email text default null
)
returns table (coupon_id uuid, code text, discount numeric, message text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  used int;
  d numeric;
begin
  select * into c from public.coupons where coupons.code = upper(trim(p_code));
  if not found or not c.is_active then
    return query select null::uuid, null::text, 0::numeric, 'This code is not valid.'; return;
  end if;
  if c.starts_at is not null and c.starts_at > now() then
    return query select null::uuid, null::text, 0::numeric, 'This code is not active yet.'; return;
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return query select null::uuid, null::text, 0::numeric, 'This code has expired.'; return;
  end if;
  if p_subtotal < c.min_order then
    return query select null::uuid, null::text, 0::numeric,
      format('Add items worth ₹%s or more to use this code.', to_char(c.min_order, 'FM99,99,999')); return;
  end if;
  if c.usage_limit is not null and c.usage_count >= c.usage_limit then
    return query select null::uuid, null::text, 0::numeric, 'This code has reached its usage limit.'; return;
  end if;
  if c.per_customer_limit is not null and (p_user_id is not null or p_email is not null) then
    select count(*) into used from public.coupon_redemptions r
    where r.coupon_id = c.id
      and ((p_user_id is not null and r.user_id = p_user_id)
        or (p_email is not null and lower(r.email) = lower(p_email)));
    if used >= c.per_customer_limit then
      return query select null::uuid, null::text, 0::numeric, 'You have already used this code.'; return;
    end if;
  end if;

  if c.type = 'percentage' then
    d := round(p_subtotal * c.value / 100, 2);
  else
    d := c.value;
  end if;
  if c.max_discount is not null then d := least(d, c.max_discount); end if;
  d := least(d, p_subtotal);

  return query select c.id, c.code, d, 'Code applied.'::text;
end;
$$;

-- Best auto-apply coupon for a given cart value (or none)
create or replace function public.best_auto_coupon(
  p_subtotal numeric,
  p_user_id uuid default null,
  p_email text default null
)
returns table (coupon_id uuid, code text, discount numeric, message text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec record;
  e record;
  b_id uuid;
  b_code text;
  b_disc numeric := 0;
  b_msg text;
begin
  for rec in select c.code as c_code from public.coupons c where c.is_active and c.auto_apply loop
    select * into e from public.evaluate_coupon(rec.c_code, p_subtotal, p_user_id, p_email);
    if e.coupon_id is not null and e.discount > b_disc then
      b_id := e.coupon_id; b_code := e.code; b_disc := e.discount; b_msg := e.message;
    end if;
  end loop;
  if b_id is not null then
    return query select b_id, b_code, b_disc, b_msg;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_order(payload) → jsonb
-- Called ONLY by the server with the service-role key (execute revoked below).
-- Every price is read from the database; the client only sends ids + qty.
--
-- payload = {
--   user_id, email, phone, customer_name, payment_method ('razorpay'|'cod'),
--   coupon_code, customer_notes, session_id, utm {...},
--   shipping_address {...}, billing_address {...},
--   items: [{ variant_id, quantity, charm_id? }]
-- }
-- ---------------------------------------------------------------------------
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_shipping_cfg jsonb := public.get_setting('shipping');
  v_free_threshold numeric := coalesce((v_shipping_cfg ->> 'free_threshold')::numeric, 2000);
  v_flat_rate numeric := coalesce((v_shipping_cfg ->> 'flat_rate')::numeric, 99);
  v_cod_enabled boolean := coalesce((v_shipping_cfg ->> 'cod_enabled')::boolean, true);
  v_cod_fee numeric := coalesce((v_shipping_cfg ->> 'cod_fee')::numeric, 0);
  v_cod_max numeric := coalesce((v_shipping_cfg ->> 'cod_max_order')::numeric, 1000000);

  v_user_id uuid := nullif(p ->> 'user_id', '')::uuid;
  v_email text := lower(trim(p ->> 'email'));
  v_method public.payment_method := coalesce(nullif(p ->> 'payment_method', ''), 'razorpay')::public.payment_method;

  v_order_id uuid;
  v_order_number text;
  v_access_token text;
  v_subtotal numeric := 0;
  v_cost numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_cod numeric := 0;
  v_tax numeric := 0;
  v_total numeric;
  v_coupon record;
  v_item record;
  v_row record;
  v_charm record;
  v_parent_id uuid;
  v_new_stock int;
  v_gross_lines numeric := 0;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if v_method = 'cod' and not v_cod_enabled then
    raise exception 'COD_DISABLED';
  end if;

  -- Blocked customers cannot order
  if v_user_id is not null and exists (select 1 from profiles where id = v_user_id and is_blocked) then
    raise exception 'ACCOUNT_BLOCKED';
  end if;

  insert into orders (
    user_id, email, phone, customer_name, status, payment_status, payment_method,
    shipping_address, billing_address, customer_notes, session_id, utm
  ) values (
    v_user_id, v_email, p ->> 'phone', p ->> 'customer_name',
    'pending', 'pending', v_method,
    p -> 'shipping_address', coalesce(p -> 'billing_address', p -> 'shipping_address'),
    nullif(p ->> 'customer_notes', ''), p ->> 'session_id', p -> 'utm'
  )
  returning id, order_number, access_token into v_order_id, v_order_number, v_access_token;

  -- Lock variants in a stable order (by id) to avoid deadlocks between
  -- concurrent checkouts, then decrement stock only if enough is available.
  for v_item in
    select (i ->> 'variant_id')::uuid as variant_id,
           greatest(1, least(10, coalesce((i ->> 'quantity')::int, 1))) as quantity,
           nullif(i ->> 'charm_id', '')::uuid as charm_id
    from jsonb_array_elements(p -> 'items') i
    order by (i ->> 'variant_id')
  loop
    select v.id, v.sku, v.colour_name, v.stock, v.price_override,
           pr.id as product_id, pr.name, pr.price, pr.cost_price, pr.gst_rate, pr.status, pr.publish_at,
           (select url from product_images im
              where im.product_id = pr.id and im.kind = 'gallery'
                and (im.variant_id = v.id or im.variant_id is null)
              order by (im.variant_id = v.id) desc nulls last, im.is_primary desc, im.sort_order
              limit 1) as image_url
      into v_row
    from product_variants v
    join products pr on pr.id = v.product_id
    where v.id = v_item.variant_id
    for update of v;

    if not found or v_row.status <> 'published' or (v_row.publish_at is not null and v_row.publish_at > now()) then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_item.variant_id;
    end if;

    update product_variants
       set stock = stock - v_item.quantity
     where id = v_item.variant_id and stock >= v_item.quantity
     returning stock into v_new_stock;
    if not found then
      raise exception 'OUT_OF_STOCK:%', v_row.name || ' (' || v_row.colour_name || ')';
    end if;

    insert into inventory_movements (variant_id, product_id, change, stock_after, type, reason, order_id)
    values (v_item.variant_id, v_row.product_id, -v_item.quantity, v_new_stock, 'sale', 'Order ' || v_order_number, v_order_id);

    insert into order_items (
      order_id, product_id, variant_id, product_name, variant_name, sku, image_url,
      unit_price, quantity, line_total, cost_price, gst_rate
    ) values (
      v_order_id, v_row.product_id, v_item.variant_id, v_row.name, v_row.colour_name, v_row.sku, v_row.image_url,
      coalesce(v_row.price_override, v_row.price), v_item.quantity,
      coalesce(v_row.price_override, v_row.price) * v_item.quantity,
      coalesce(v_row.cost_price, 0), v_row.gst_rate
    ) returning id into v_parent_id;

    v_subtotal := v_subtotal + coalesce(v_row.price_override, v_row.price) * v_item.quantity;
    v_cost := v_cost + coalesce(v_row.cost_price, 0) * v_item.quantity;
    v_gross_lines := v_gross_lines
      + (coalesce(v_row.price_override, v_row.price) * v_item.quantity) * v_row.gst_rate / (100 + v_row.gst_rate);

    -- Optional charm attached to this bag
    if v_item.charm_id is not null then
      select * into v_charm from charms where id = v_item.charm_id for update;
      if not found or not v_charm.is_active then
        raise exception 'CHARM_UNAVAILABLE:%', v_item.charm_id;
      end if;
      update charms set stock = stock - v_item.quantity
       where id = v_item.charm_id and stock >= v_item.quantity
       returning stock into v_new_stock;
      if not found then
        raise exception 'OUT_OF_STOCK:%', v_charm.name;
      end if;
      insert into inventory_movements (charm_id, change, stock_after, type, reason, order_id)
      values (v_item.charm_id, -v_item.quantity, v_new_stock, 'sale', 'Order ' || v_order_number, v_order_id);

      insert into order_items (
        order_id, charm_id, parent_item_id, product_name, variant_name, image_url,
        unit_price, quantity, line_total, cost_price, gst_rate
      ) values (
        v_order_id, v_charm.id, v_parent_id, v_charm.name, 'Charm', v_charm.image_url,
        v_charm.price, v_item.quantity, v_charm.price * v_item.quantity, coalesce(v_charm.cost_price, 0), 18
      );
      v_subtotal := v_subtotal + v_charm.price * v_item.quantity;
      v_cost := v_cost + coalesce(v_charm.cost_price, 0) * v_item.quantity;
      v_gross_lines := v_gross_lines + (v_charm.price * v_item.quantity) * 18 / 118;
    end if;
  end loop;

  -- Coupon (explicit code first, otherwise best auto-apply coupon)
  if nullif(trim(p ->> 'coupon_code'), '') is not null then
    select * into v_coupon from evaluate_coupon(p ->> 'coupon_code', v_subtotal, v_user_id, v_email);
    if v_coupon.coupon_id is null then
      raise exception 'COUPON_INVALID:%', v_coupon.message;
    end if;
  else
    select * into v_coupon from best_auto_coupon(v_subtotal, v_user_id, v_email);
  end if;

  if v_coupon.coupon_id is not null then
    v_discount := v_coupon.discount;
    update coupons set usage_count = usage_count + 1 where id = v_coupon.coupon_id;
    insert into coupon_redemptions (coupon_id, order_id, user_id, email, discount_amount)
    values (v_coupon.coupon_id, v_order_id, v_user_id, v_email, v_discount);
  end if;

  v_shipping := case when (v_subtotal - v_discount) >= v_free_threshold then 0 else v_flat_rate end;
  v_cod := case when v_method = 'cod' then v_cod_fee else 0 end;
  v_total := greatest(0, v_subtotal - v_discount) + v_shipping + v_cod;

  if v_method = 'cod' and v_total > v_cod_max then
    raise exception 'COD_LIMIT:%', v_cod_max;
  end if;

  -- GST is included in prices; scale the line GST by the discount ratio.
  if v_subtotal > 0 then
    v_tax := round(v_gross_lines * (v_subtotal - v_discount) / v_subtotal, 2);
  end if;

  update orders set
    subtotal = v_subtotal,
    discount_total = v_discount,
    shipping_total = v_shipping,
    cod_fee = v_cod,
    tax_total = v_tax,
    total = v_total,
    cost_total = v_cost,
    coupon_id = v_coupon.coupon_id,
    coupon_code = v_coupon.code,
    status = case when v_method = 'cod' then 'placed'::order_status else 'pending'::order_status end,
    placed_at = case when v_method = 'cod' then now() else null end
  where id = v_order_id;

  insert into order_status_history (order_id, status, note, is_customer_visible)
  values (
    v_order_id,
    case when v_method = 'cod' then 'placed'::order_status else 'pending'::order_status end,
    case when v_method = 'cod' then 'Order placed (Cash on Delivery)' else 'Awaiting payment' end,
    v_method = 'cod'
  );

  if v_method = 'cod' then
    update products pr set total_sold = total_sold + oi.qty
    from (select product_id, sum(quantity) qty from order_items where order_id = v_order_id and product_id is not null group by product_id) oi
    where pr.id = oi.product_id;
  end if;

  -- Abandoned cart recovery attribution
  update carts set status = case when status = 'abandoned' then 'recovered'::cart_status else 'converted'::cart_status end,
                   recovered_order_id = v_order_id,
                   updated_at = now()
  where status in ('active', 'abandoned')
    and ((v_user_id is not null and user_id = v_user_id) or lower(email) = v_email
         or (p ->> 'session_id' is not null and session_id = p ->> 'session_id'));

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_access_token,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping', v_shipping,
    'cod_fee', v_cod,
    'tax', v_tax,
    'total', v_total,
    'status', case when v_method = 'cod' then 'placed' else 'pending' end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Restore stock + coupon usage for an order (cancel / failed payment)
-- ---------------------------------------------------------------------------
create or replace function public.release_order(p_order_id uuid, p_reason text default 'Cancelled', p_actor uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
  it record;
  v_new int;
begin
  select * into o from orders where id = p_order_id for update;
  if not found or o.status in ('cancelled', 'returned', 'delivered', 'shipped', 'out_for_delivery') then
    return;
  end if;

  for it in select * from order_items where order_id = p_order_id loop
    if it.variant_id is not null then
      update product_variants set stock = stock + it.quantity where id = it.variant_id returning stock into v_new;
      insert into inventory_movements (variant_id, product_id, change, stock_after, type, reason, order_id, created_by)
      values (it.variant_id, it.product_id, it.quantity, v_new, 'cancellation', p_reason, p_order_id, p_actor);
    elsif it.charm_id is not null then
      update charms set stock = stock + it.quantity where id = it.charm_id returning stock into v_new;
      insert into inventory_movements (charm_id, change, stock_after, type, reason, order_id, created_by)
      values (it.charm_id, it.quantity, v_new, 'cancellation', p_reason, p_order_id, p_actor);
    end if;
  end loop;

  if o.coupon_id is not null then
    update coupons set usage_count = greatest(0, usage_count - 1) where id = o.coupon_id;
    delete from coupon_redemptions where order_id = p_order_id;
  end if;

  -- Undo sales counter for orders that had been placed
  if o.status <> 'pending' then
    update products pr set total_sold = greatest(0, total_sold - oi.qty)
    from (select product_id, sum(quantity) qty from order_items where order_id = p_order_id and product_id is not null group by product_id) oi
    where pr.id = oi.product_id;
  end if;

  update orders set status = 'cancelled', cancelled_at = now(),
    payment_status = case when payment_status = 'pending' then 'failed'::payment_status else payment_status end
  where id = p_order_id;

  insert into order_status_history (order_id, status, note, created_by)
  values (p_order_id, 'cancelled', p_reason, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- Mark an online order as paid (idempotent; used by verify + webhook)
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_signature text,
  p_amount_paise bigint,
  p_method text,
  p_raw jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
  it record;
  v_ok boolean := true;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if o.razorpay_order_id is not null and o.razorpay_order_id <> p_razorpay_order_id then
    raise exception 'RAZORPAY_ORDER_MISMATCH';
  end if;

  if round(o.total * 100) <> p_amount_paise then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  insert into payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, status, method, raw)
  values (p_order_id, p_razorpay_order_id, p_razorpay_payment_id, p_signature, p_amount_paise / 100.0, 'captured', p_method, p_raw)
  on conflict (razorpay_payment_id) do update
    set status = 'captured', method = excluded.method, raw = coalesce(excluded.raw, payments.raw), updated_at = now();

  if o.payment_status = 'paid' then
    return jsonb_build_object('order_number', o.order_number, 'already_paid', true);
  end if;

  -- Payment arrived after the order auto-cancelled: try to re-reserve stock.
  if o.status = 'cancelled' then
    -- The inner block is a savepoint: if any line is short, every decrement
    -- made inside it is rolled back automatically.
    begin
      for it in select * from order_items where order_id = p_order_id loop
        if it.variant_id is not null then
          update product_variants set stock = stock - it.quantity where id = it.variant_id and stock >= it.quantity;
          if not found then raise exception 'NO_STOCK'; end if;
        elsif it.charm_id is not null then
          update charms set stock = stock - it.quantity where id = it.charm_id and stock >= it.quantity;
          if not found then raise exception 'NO_STOCK'; end if;
        end if;
      end loop;
      if o.coupon_id is not null then
        update coupons set usage_count = usage_count + 1 where id = o.coupon_id;
      end if;
    exception when others then
      v_ok := false;
    end;
    if not v_ok then
      update orders set payment_status = 'paid',
        internal_notes = coalesce(internal_notes || E'\n', '') || 'Payment received after cancellation and stock unavailable — refund required.'
      where id = p_order_id;
      return jsonb_build_object('order_number', o.order_number, 'refund_required', true);
    end if;
  end if;

  update orders set payment_status = 'paid', status = 'placed', placed_at = now(), cancelled_at = null
  where id = p_order_id;

  update products pr set total_sold = total_sold + oi.qty
  from (select product_id, sum(quantity) qty from order_items where order_id = p_order_id and product_id is not null group by product_id) oi
  where pr.id = oi.product_id;

  insert into order_status_history (order_id, status, note)
  values (p_order_id, 'placed', 'Payment received via ' || coalesce(p_method, 'Razorpay'));

  return jsonb_build_object('order_number', o.order_number, 'already_paid', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Manual stock adjustments by staff (logged)
-- ---------------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_variant_id uuid,
  p_change int,
  p_type public.movement_type default 'adjustment',
  p_reason text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new int;
  v_product uuid;
begin
  if not public.is_staff() and auth.uid() is not null then
    raise exception 'FORBIDDEN';
  end if;
  update product_variants set stock = greatest(0, stock + p_change)
  where id = p_variant_id
  returning stock, product_id into v_new, v_product;
  if not found then raise exception 'VARIANT_NOT_FOUND'; end if;

  insert into inventory_movements (variant_id, product_id, change, stock_after, type, reason, created_by)
  values (p_variant_id, v_product, p_change, v_new, p_type, p_reason, auth.uid());
  return v_new;
end;
$$;

-- Set an absolute stock value (inline editing) — logs the difference
create or replace function public.set_stock(p_variant_id uuid, p_stock int, p_reason text default 'Inline edit')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old int;
begin
  select stock into v_old from product_variants where id = p_variant_id;
  if not found then raise exception 'VARIANT_NOT_FOUND'; end if;
  return public.adjust_stock(p_variant_id, greatest(0, p_stock) - v_old, 'adjustment', p_reason);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reviews → product rating aggregate
-- ---------------------------------------------------------------------------
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid := coalesce(new.product_id, old.product_id);
begin
  update products set
    rating_avg = coalesce((select round(avg(rating)::numeric, 1) from reviews where product_id = pid and status = 'approved'), 0),
    rating_count = (select count(*) from reviews where product_id = pid and status = 'approved')
  where id = pid;
  return null;
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- Has the current user bought (and received) this product?
create or replace function public.has_purchased(p_product_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from order_items oi
    join orders o on o.id = oi.order_id
    where oi.product_id = p_product_id
      and o.user_id = p_user_id
      and o.status = 'delivered'
  );
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window). Returns true when the call is allowed.
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r rate_limits%rowtype;
begin
  insert into rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning * into r;
  return r.count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Housekeeping jobs (called by pg_cron, see migration 0007)
-- ---------------------------------------------------------------------------
create or replace function public.release_stale_pending_orders(p_minutes int default 45)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  n int := 0;
begin
  for o in
    select id from orders
    where status = 'pending' and payment_status in ('pending', 'failed')
      and created_at < now() - make_interval(mins => p_minutes)
  loop
    perform public.release_order(o.id, 'Payment not completed — order released automatically');
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.mark_abandoned_carts(p_minutes int default 60)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  update carts set status = 'abandoned', abandoned_at = now()
  where status = 'active'
    and item_count > 0
    and (user_id is not null or email is not null)
    and last_activity_at < now() - make_interval(mins => p_minutes);
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.purge_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limits where window_start < now() - interval '1 day';
$$;

-- ---------------------------------------------------------------------------
-- Lock down privileged functions: only the service role may call them.
-- ---------------------------------------------------------------------------
revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
revoke execute on function public.release_order(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, text, text, text, bigint, text, jsonb) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.release_stale_pending_orders(int) from public, anon, authenticated;
revoke execute on function public.mark_abandoned_carts(int) from public, anon, authenticated;
revoke execute on function public.purge_rate_limits() from public, anon, authenticated;
revoke execute on function public.evaluate_coupon(text, numeric, uuid, text) from public, anon;
revoke execute on function public.best_auto_coupon(numeric, uuid, text) from public, anon;
revoke execute on function public.adjust_stock(uuid, int, public.movement_type, text) from public, anon;
revoke execute on function public.set_stock(uuid, int, text) from public, anon;

grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.release_order(uuid, text, uuid) to service_role;
grant execute on function public.mark_order_paid(uuid, text, text, text, bigint, text, jsonb) to service_role;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
grant execute on function public.release_stale_pending_orders(int) to service_role;
grant execute on function public.mark_abandoned_carts(int) to service_role;
grant execute on function public.purge_rate_limits() to service_role;
grant execute on function public.evaluate_coupon(text, numeric, uuid, text) to authenticated, service_role;
grant execute on function public.best_auto_coupon(numeric, uuid, text) to authenticated, service_role;
grant execute on function public.adjust_stock(uuid, int, public.movement_type, text) to authenticated, service_role;
grant execute on function public.set_stock(uuid, int, text) to authenticated, service_role;
