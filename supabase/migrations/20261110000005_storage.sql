-- =============================================================================
-- seicase · 0005 · Storage buckets and policies
--   product-images  public   (product photos, 360° sequences, review photos)
--   cms-images      public   (hero slides, banners, journal covers)
--   invoices        private  (generated invoice PDFs, served via signed route)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('cms-images', 'cms-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'video/mp4']),
  ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for the two public buckets
drop policy if exists "public read seicase images" on storage.objects;
create policy "public read seicase images" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('product-images', 'cms-images'));

-- Staff manage everything in all three buckets
drop policy if exists "staff manage seicase storage" on storage.objects;
create policy "staff manage seicase storage" on storage.objects
  for all to authenticated
  using (bucket_id in ('product-images', 'cms-images', 'invoices') and public.is_staff())
  with check (bucket_id in ('product-images', 'cms-images', 'invoices') and public.is_staff());

-- Customers may upload review photos into product-images/reviews/<their uid>/
drop policy if exists "customers upload review photos" on storage.objects;
create policy "customers upload review photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'reviews'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Customers may upload return photos into product-images/returns/<their uid>/
drop policy if exists "customers upload return photos" on storage.objects;
create policy "customers upload return photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'returns'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
