-- =============================================================================
-- seicase · 0007 · Scheduled jobs (pg_cron)
-- Enable pg_cron first: Supabase Dashboard → Database → Extensions → pg_cron.
-- This migration is safe to run without pg_cron: it just prints a notice.
-- =============================================================================

do $outer$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron is not available — enable it in the Supabase dashboard and re-run this migration.';
    return;
  end;

  -- Remove previous versions of the jobs so this file can be re-run
  perform cron.unschedule(jobname) from cron.job
  where jobname in (
    'seicase-refresh-analytics', 'seicase-release-pending-orders',
    'seicase-mark-abandoned-carts', 'seicase-purge-rate-limits'
  );

  perform cron.schedule('seicase-refresh-analytics', '*/15 * * * *',
    $$select public.refresh_analytics_views()$$);
  perform cron.schedule('seicase-release-pending-orders', '*/10 * * * *',
    $$select public.release_stale_pending_orders(45)$$);
  perform cron.schedule('seicase-mark-abandoned-carts', '*/15 * * * *',
    $$select public.mark_abandoned_carts(60)$$);
  perform cron.schedule('seicase-purge-rate-limits', '0 * * * *',
    $$select public.purge_rate_limits()$$);
end
$outer$;
