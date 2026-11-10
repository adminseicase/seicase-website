-- =============================================================================
-- seicase · 0006 · Analytics: materialized views + report functions
-- Every report function checks is_staff() and returns jsonb so the admin
-- dashboard can load a whole report in one round trip.
-- "Revenue orders" = orders that are placed or later and not cancelled.
-- =============================================================================

create or replace function public.assert_staff()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for the service role (server-side jobs)
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Materialized views (refreshed by pg_cron every 15 minutes)
-- ---------------------------------------------------------------------------
drop materialized view if exists public.mv_daily_sales;
create materialized view public.mv_daily_sales as
select
  (o.created_at at time zone 'Asia/Kolkata')::date as day,
  count(*)::int as orders,
  sum(o.total)::numeric(14,2) as revenue,
  sum(o.discount_total)::numeric(14,2) as discount,
  sum(o.shipping_total)::numeric(14,2) as shipping,
  sum(o.total - o.shipping_total - o.cod_fee - o.cost_total)::numeric(14,2) as gross_profit,
  coalesce(sum((select sum(quantity) from public.order_items oi where oi.order_id = o.id and oi.product_id is not null)), 0)::int as units
from public.orders o
where o.status not in ('pending', 'cancelled')
group by 1;
create unique index if not exists mv_daily_sales_day_idx on public.mv_daily_sales (day);

drop materialized view if exists public.mv_product_stats;
create materialized view public.mv_product_stats as
select
  p.id as product_id,
  p.name,
  coalesce(v.views_30d, 0)::int as views_30d,
  coalesce(s.units, 0)::int as units_sold,
  coalesce(s.revenue, 0)::numeric(14,2) as revenue,
  coalesce(w.wishlisted, 0)::int as wishlisted
from public.products p
left join (
  select product_id, count(*) as views_30d
  from public.analytics_events
  where event_name = 'product_view' and created_at > now() - interval '30 days'
  group by product_id
) v on v.product_id = p.id
left join (
  select oi.product_id, sum(oi.quantity) units, sum(oi.line_total) revenue
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where o.status not in ('pending', 'cancelled')
  group by oi.product_id
) s on s.product_id = p.id
left join (
  select product_id, count(*) wishlisted from public.wishlists group by product_id
) w on w.product_id = p.id;
create unique index if not exists mv_product_stats_idx on public.mv_product_stats (product_id);

revoke all on public.mv_daily_sales from anon, authenticated;
revoke all on public.mv_product_stats from anon, authenticated;

create or replace function public.refresh_analytics_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.mv_daily_sales;
  refresh materialized view concurrently public.mv_product_stats;
end;
$$;

-- ---------------------------------------------------------------------------
-- KPIs for a period
-- ---------------------------------------------------------------------------
create or replace function public.analytics_kpis(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_orders int;
  v_revenue numeric;
  v_profit numeric;
  v_discount numeric;
  v_sessions int;
  v_visitors int;
  v_refunded int;
  v_new int;
  v_returning int;
  v_items int;
begin
  perform public.assert_staff();

  select count(*), coalesce(sum(total), 0),
         coalesce(sum(total - shipping_total - cod_fee - cost_total), 0),
         coalesce(sum(discount_total), 0),
         count(*) filter (where status = 'returned' or payment_status in ('refunded', 'partially_refunded'))
    into v_orders, v_revenue, v_profit, v_discount, v_refunded
  from orders
  where created_at >= p_from and created_at < p_to and status not in ('pending', 'cancelled');

  select coalesce(sum(oi.quantity), 0) into v_items
  from order_items oi join orders o on o.id = oi.order_id
  where o.created_at >= p_from and o.created_at < p_to and o.status not in ('pending', 'cancelled')
    and oi.product_id is not null;

  select count(distinct session_id), count(distinct coalesce(user_id::text, session_id))
    into v_sessions, v_visitors
  from analytics_events
  where event_name = 'page_view' and created_at >= p_from and created_at < p_to;

  with period_customers as (
    select distinct coalesce(user_id::text, lower(email)) as ck
    from orders
    where created_at >= p_from and created_at < p_to and status not in ('pending', 'cancelled')
  ), firsts as (
    select coalesce(user_id::text, lower(email)) as ck, min(created_at) as first_at
    from orders where status not in ('pending', 'cancelled')
    group by 1
  )
  select count(*) filter (where f.first_at >= p_from), count(*) filter (where f.first_at < p_from)
    into v_new, v_returning
  from period_customers pc join firsts f using (ck);

  return jsonb_build_object(
    'revenue', v_revenue,
    'orders', v_orders,
    'units', v_items,
    'aov', case when v_orders > 0 then round(v_revenue / v_orders, 2) else 0 end,
    'sessions', v_sessions,
    'visitors', v_visitors,
    'conversion_rate', case when v_sessions > 0 then round(v_orders::numeric * 100 / v_sessions, 2) else 0 end,
    'new_customers', coalesce(v_new, 0),
    'returning_customers', coalesce(v_returning, 0),
    'refund_rate', case when v_orders > 0 then round(v_refunded::numeric * 100 / v_orders, 2) else 0 end,
    'gross_profit', v_profit,
    'discount_total', v_discount
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Sales over time (day | week | month), in IST
-- Past days come from the materialized view, today is computed live.
-- ---------------------------------------------------------------------------
create or replace function public.analytics_sales_series(p_from timestamptz, p_to timestamptz, p_grain text default 'day')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_grain text := case when p_grain in ('day', 'week', 'month') then p_grain else 'day' end;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  result jsonb;
begin
  perform public.assert_staff();

  with daily as (
    select day, orders, revenue, gross_profit from mv_daily_sales
    where day >= (p_from at time zone 'Asia/Kolkata')::date
      and day < (p_to at time zone 'Asia/Kolkata')::date
      and day < v_today
    union all
    select v_today, count(*)::int, coalesce(sum(total), 0), coalesce(sum(total - shipping_total - cod_fee - cost_total), 0)
    from orders
    where (created_at at time zone 'Asia/Kolkata')::date = v_today
      and status not in ('pending', 'cancelled')
      and v_today >= (p_from at time zone 'Asia/Kolkata')::date
      and v_today <= (p_to at time zone 'Asia/Kolkata')::date
  ), buckets as (
    select generate_series(
      date_trunc(v_grain, (p_from at time zone 'Asia/Kolkata')),
      date_trunc(v_grain, (p_to at time zone 'Asia/Kolkata') - interval '1 second'),
      ('1 ' || v_grain)::interval
    )::date as bucket
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'date', b.bucket,
      'orders', coalesce(x.orders, 0),
      'revenue', coalesce(x.revenue, 0),
      'profit', coalesce(x.profit, 0)
    ) order by b.bucket), '[]'::jsonb)
  into result
  from buckets b
  left join (
    select date_trunc(v_grain, day)::date as bucket, sum(orders) orders, sum(revenue) revenue, sum(gross_profit) profit
    from daily group by 1
  ) x on x.bucket = b.bucket;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Full report bundle for the analytics page
-- ---------------------------------------------------------------------------
create or replace function public.analytics_report(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r jsonb := '{}'::jsonb;
begin
  perform public.assert_staff();

  -- Conversion funnel (distinct sessions reaching each step)
  r := r || jsonb_build_object('funnel', (
    select jsonb_build_array(
      jsonb_build_object('step', 'Visits', 'sessions', count(distinct session_id) filter (where event_name = 'page_view')),
      jsonb_build_object('step', 'Product views', 'sessions', count(distinct session_id) filter (where event_name = 'product_view')),
      jsonb_build_object('step', 'Add to cart', 'sessions', count(distinct session_id) filter (where event_name = 'add_to_cart')),
      jsonb_build_object('step', 'Checkout', 'sessions', count(distinct session_id) filter (where event_name = 'begin_checkout')),
      jsonb_build_object('step', 'Purchase', 'sessions', count(distinct session_id) filter (where event_name = 'purchase'))
    )
    from analytics_events where created_at >= p_from and created_at < p_to
  ));

  -- Top products by revenue / units / views / view→purchase
  r := r || jsonb_build_object('top_products', coalesce((
    select jsonb_agg(t order by t.revenue desc) from (
      select p.id, p.name, p.slug,
        coalesce(s.units, 0) as units,
        coalesce(s.revenue, 0) as revenue,
        coalesce(v.views, 0) as views,
        case when coalesce(v.views, 0) > 0 then round(coalesce(s.orders, 0)::numeric * 100 / v.views, 2) else 0 end as view_to_purchase
      from products p
      left join (
        select oi.product_id, sum(oi.quantity) units, sum(oi.line_total) revenue, count(distinct oi.order_id) orders
        from order_items oi join orders o on o.id = oi.order_id
        where o.created_at >= p_from and o.created_at < p_to and o.status not in ('pending', 'cancelled')
        group by oi.product_id
      ) s on s.product_id = p.id
      left join (
        select product_id, count(*) views from analytics_events
        where event_name = 'product_view' and created_at >= p_from and created_at < p_to
        group by product_id
      ) v on v.product_id = p.id
      where coalesce(s.units, 0) > 0 or coalesce(v.views, 0) > 0
      order by coalesce(s.revenue, 0) desc, coalesce(v.views, 0) desc
      limit 15
    ) t
  ), '[]'::jsonb));

  -- Category performance
  r := r || jsonb_build_object('categories', coalesce((
    select jsonb_agg(t order by t.revenue desc) from (
      select coalesce(c.name, 'Uncategorised') as name, sum(oi.quantity) units, sum(oi.line_total) revenue
      from order_items oi
      join orders o on o.id = oi.order_id
      left join products p on p.id = oi.product_id
      left join categories c on c.id = p.category_id
      where o.created_at >= p_from and o.created_at < p_to and o.status not in ('pending', 'cancelled')
        and oi.product_id is not null
      group by 1
    ) t
  ), '[]'::jsonb));

  -- Colour performance
  r := r || jsonb_build_object('colours', coalesce((
    select jsonb_agg(t order by t.revenue desc) from (
      select oi.variant_name as name, max(v.colour_hex) as hex, sum(oi.quantity) units, sum(oi.line_total) revenue
      from order_items oi
      join orders o on o.id = oi.order_id
      left join product_variants v on v.id = oi.variant_id
      where o.created_at >= p_from and o.created_at < p_to and o.status not in ('pending', 'cancelled')
        and oi.variant_id is not null
      group by oi.variant_name
    ) t
  ), '[]'::jsonb));

  -- Traffic sources (first touch per session)
  r := r || jsonb_build_object('sources', coalesce((
    select jsonb_agg(t order by t.sessions desc) from (
      select source, count(*) sessions from (
        select distinct on (session_id)
          coalesce(nullif(utm_source, ''),
            case
              when referrer_host is null or referrer_host = '' then 'Direct'
              when referrer_host ~* 'google' then 'Google'
              when referrer_host ~* 'instagram' then 'Instagram'
              when referrer_host ~* 'facebook|fb\.' then 'Facebook'
              when referrer_host ~* 'pinterest' then 'Pinterest'
              when referrer_host ~* 'youtube' then 'YouTube'
              when referrer_host ~* 'bing' then 'Bing'
              else referrer_host
            end) as source
        from analytics_events
        where event_name = 'page_view' and created_at >= p_from and created_at < p_to
        order by session_id, created_at
      ) s group by source order by count(*) desc limit 12
    ) t
  ), '[]'::jsonb));

  -- UTM campaigns
  r := r || jsonb_build_object('campaigns', coalesce((
    select jsonb_agg(t order by t.sessions desc) from (
      select e.utm_campaign as campaign, max(e.utm_source) as source, max(e.utm_medium) as medium,
             count(distinct e.session_id) sessions,
             (select count(*) from orders o where o.utm ->> 'campaign' = e.utm_campaign
                and o.created_at >= p_from and o.created_at < p_to and o.status not in ('pending', 'cancelled')) as orders,
             (select coalesce(sum(total), 0) from orders o where o.utm ->> 'campaign' = e.utm_campaign
                and o.created_at >= p_from and o.created_at < p_to and o.status not in ('pending', 'cancelled')) as revenue
      from analytics_events e
      where e.utm_campaign is not null and e.created_at >= p_from and e.created_at < p_to
      group by e.utm_campaign
      limit 20
    ) t
  ), '[]'::jsonb));

  -- Devices
  r := r || jsonb_build_object('devices', coalesce((
    select jsonb_agg(t order by t.sessions desc) from (
      select coalesce(device_type, 'unknown') as device, count(distinct session_id) sessions
      from analytics_events
      where event_name = 'page_view' and created_at >= p_from and created_at < p_to
      group by 1
    ) t
  ), '[]'::jsonb));

  -- Cities and states
  r := r || jsonb_build_object('cities', coalesce((
    select jsonb_agg(t order by t.sessions desc) from (
      select city, max(region) as region, count(distinct session_id) sessions
      from analytics_events
      where event_name = 'page_view' and city is not null and created_at >= p_from and created_at < p_to
      group by city order by 3 desc limit 10
    ) t
  ), '[]'::jsonb));

  r := r || jsonb_build_object('states', coalesce((
    select jsonb_agg(t order by t.orders desc) from (
      select o.shipping_address ->> 'state' as state, count(*) orders, sum(o.total) revenue
      from orders o
      where o.created_at >= p_from and o.created_at < p_to and o.status not in ('pending', 'cancelled')
      group by 1 order by 2 desc limit 10
    ) t
  ), '[]'::jsonb));

  -- Search terms and zero-result searches
  r := r || jsonb_build_object('searches', coalesce((
    select jsonb_agg(t order by t.count desc) from (
      select lower(trim(search_query)) as term, count(*) as count, round(avg(results_count), 1) as avg_results
      from analytics_events
      where event_name = 'search' and search_query is not null and created_at >= p_from and created_at < p_to
      group by 1 order by 2 desc limit 15
    ) t
  ), '[]'::jsonb));

  r := r || jsonb_build_object('zero_result_searches', coalesce((
    select jsonb_agg(t order by t.count desc) from (
      select lower(trim(search_query)) as term, count(*) as count
      from analytics_events
      where event_name = 'search' and results_count = 0 and created_at >= p_from and created_at < p_to
      group by 1 order by 2 desc limit 15
    ) t
  ), '[]'::jsonb));

  -- Most wishlisted (all-time saved + in-period adds)
  r := r || jsonb_build_object('wishlisted', coalesce((
    select jsonb_agg(t order by t.saved desc) from (
      select p.id, p.name, p.slug,
        (select count(*) from wishlists w where w.product_id = p.id) as saved,
        (select count(*) from analytics_events e where e.product_id = p.id and e.event_name = 'add_to_wishlist'
           and e.created_at >= p_from and e.created_at < p_to) as added_in_period
      from products p
      order by 4 desc, 5 desc
      limit 10
    ) t where t.saved > 0 or t.added_in_period > 0
  ), '[]'::jsonb));

  -- Abandoned carts
  r := r || jsonb_build_object('abandoned', (
    select jsonb_build_object(
      'count', count(*) filter (where status in ('abandoned', 'recovered')),
      'value', coalesce(sum(subtotal) filter (where status in ('abandoned', 'recovered')), 0),
      'recovered', count(*) filter (where status = 'recovered'),
      'recovered_value', coalesce(sum(subtotal) filter (where status = 'recovered'), 0),
      'recovery_rate', case when count(*) filter (where status in ('abandoned', 'recovered')) > 0
        then round((count(*) filter (where status = 'recovered'))::numeric * 100
             / count(*) filter (where status in ('abandoned', 'recovered')), 2) else 0 end
    )
    from carts where coalesce(abandoned_at, updated_at) >= p_from and coalesce(abandoned_at, updated_at) < p_to
  ));

  -- Coupon usage
  r := r || jsonb_build_object('coupons', coalesce((
    select jsonb_agg(t order by t.uses desc) from (
      select c.code, count(cr.id) uses, coalesce(sum(cr.discount_amount), 0) discount,
             coalesce(sum(o.total), 0) revenue
      from coupon_redemptions cr
      join coupons c on c.id = cr.coupon_id
      join orders o on o.id = cr.order_id
      where cr.created_at >= p_from and cr.created_at < p_to and o.status not in ('pending', 'cancelled')
      group by c.code
    ) t
  ), '[]'::jsonb));

  -- Repeat purchase rate (all customers who ordered before p_to)
  r := r || jsonb_build_object('repeat', (
    with per_customer as (
      select coalesce(user_id::text, lower(email)) ck, count(*) n
      from orders where status not in ('pending', 'cancelled') and created_at < p_to
      group by 1
    )
    select jsonb_build_object(
      'customers', count(*),
      'repeat_customers', count(*) filter (where n > 1),
      'repeat_rate', case when count(*) > 0 then round((count(*) filter (where n > 1))::numeric * 100 / count(*), 2) else 0 end
    ) from per_customer
  ));

  -- Monthly cohorts: % of customers ordering again N months after first order
  r := r || jsonb_build_object('cohorts', coalesce((
    with base as (
      select coalesce(user_id::text, lower(email)) ck, date_trunc('month', created_at) m
      from orders where status not in ('pending', 'cancelled')
    ), firsts as (
      select ck, min(m) cohort from base group by ck
    ), activity as (
      select f.cohort, b.ck,
        (extract(year from b.m) - extract(year from f.cohort)) * 12 + (extract(month from b.m) - extract(month from f.cohort)) as offset_m
      from base b join firsts f using (ck)
    )
    select jsonb_agg(c order by c.cohort desc) from (
      select to_char(cohort, 'YYYY-MM') as cohort,
        count(distinct ck) filter (where offset_m = 0) as customers,
        count(distinct ck) filter (where offset_m = 1) as m1,
        count(distinct ck) filter (where offset_m = 2) as m2,
        count(distinct ck) filter (where offset_m = 3) as m3,
        count(distinct ck) filter (where offset_m between 4 and 6) as m4_6
      from activity
      where cohort >= date_trunc('month', p_to) - interval '11 months'
      group by cohort
    ) c
  ), '[]'::jsonb));

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Real-time panel
-- ---------------------------------------------------------------------------
create or replace function public.analytics_realtime()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'active_visitors', (select count(distinct session_id) from analytics_events where created_at > now() - interval '5 minutes'),
    'active_pages', coalesce((
      select jsonb_agg(t) from (
        select path, count(distinct session_id) visitors from analytics_events
        where created_at > now() - interval '5 minutes' and event_name = 'page_view'
        group by path order by 2 desc limit 6
      ) t), '[]'::jsonb),
    'recent_orders', coalesce((
      select jsonb_agg(t) from (
        select id, order_number, customer_name, total, status, payment_method, created_at,
               shipping_address ->> 'city' as city
        from orders where status <> 'pending'
        order by created_at desc limit 8
      ) t), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Tracker counts (badges in the admin sidebar)
-- ---------------------------------------------------------------------------
create or replace function public.admin_tracker_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'low_stock', (select count(*) from product_variants v join products p on p.id = v.product_id
                  where p.status <> 'archived' and v.stock > 0 and v.stock <= p.low_stock_threshold),
    'out_of_stock', (select count(*) from product_variants v join products p on p.id = v.product_id
                     where p.status <> 'archived' and v.stock = 0),
    'orders_to_ship', (select count(*) from orders where status in ('placed', 'confirmed')),
    'delayed_orders', (select count(*) from orders where status in ('placed', 'confirmed') and placed_at < now() - interval '3 days'),
    'returns_open', (select count(*) from returns where status in ('requested', 'approved', 'received')),
    'reviews_pending', (select count(*) from reviews where status = 'pending'),
    'messages_unread', (select count(*) from contact_messages where not is_read),
    'payments_failed_24h', (select count(*) from payments where status = 'failed' and created_at > now() - interval '24 hours'),
    'abandoned_carts', (select count(*) from carts where status = 'abandoned' and reminder_sent_at is null)
  );
end;
$$;

revoke execute on function public.refresh_analytics_views() from public, anon, authenticated;
grant execute on function public.refresh_analytics_views() to service_role;
revoke execute on function public.analytics_kpis(timestamptz, timestamptz) from public, anon;
revoke execute on function public.analytics_sales_series(timestamptz, timestamptz, text) from public, anon;
revoke execute on function public.analytics_report(timestamptz, timestamptz) from public, anon;
revoke execute on function public.analytics_realtime() from public, anon;
revoke execute on function public.admin_tracker_counts() from public, anon;
grant execute on function public.analytics_kpis(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.analytics_sales_series(timestamptz, timestamptz, text) to authenticated, service_role;
grant execute on function public.analytics_report(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.analytics_realtime() to authenticated, service_role;
grant execute on function public.admin_tracker_counts() to authenticated, service_role;
