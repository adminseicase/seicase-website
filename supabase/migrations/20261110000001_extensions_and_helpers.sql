-- =============================================================================
-- seicase · 0001 · Extensions, enums and shared helper functions
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('customer', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.publish_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  -- 'pending' = created, awaiting online payment (never shown as a live order)
  create type public.order_status as enum (
    'pending', 'placed', 'confirmed', 'shipped', 'out_for_delivery',
    'delivered', 'cancelled', 'returned'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('razorpay', 'cod');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.return_status as enum (
    'requested', 'approved', 'rejected', 'received', 'refunded', 'exchanged'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('percentage', 'flat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_type as enum (
    'sale', 'restock', 'return', 'adjustment', 'cancellation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cart_status as enum ('active', 'converted', 'abandoned', 'recovered');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Slug helper ("The Tulip Tote" -> "the-tulip-tote")
-- ---------------------------------------------------------------------------
create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;
