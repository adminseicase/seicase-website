# Troubleshooting

Find the symptom, then try the fix. Most problems come from an environment variable or a Supabase setting.

## Installing and running

| Problem                                                                   | Fix                                                                                                                                                                                             |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install` is very slow or fails with `EPERM` / `EBUSY` on Windows     | Move the project out of OneDrive (or pause OneDrive syncing), delete `node_modules`, and run `npm install` again.                                                                               |
| `node: command not found` or "Unsupported engine"                         | Install Node.js 20 LTS or newer from nodejs.org and open a new terminal.                                                                                                                        |
| Port 3000 already in use                                                  | Run `npm run dev -- -p 3001`.                                                                                                                                                                   |
| The store shows sample products and checkout says **"demo mode"**         | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing from `.env.local`, or you didn't restart `npm run dev` after adding them.                                              |
| I changed `.env.local` but nothing changed                                | Stop the server (`Ctrl + C`) and start it again. On Vercel, **Redeploy**.                                                                                                                       |
| Build error mentioning `generateMetadata`, `Suspense` or "blocking route" | You added code that reads cookies or search params outside a `<Suspense>` boundary. Wrap that component in `<Suspense>`, as the existing pages do. See `node_modules/next/dist/docs` → Caching. |

## Database / Supabase

| Problem                                                             | Fix                                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL error `relation "…" does not exist` while running migrations    | Run the files **in order**, 0001 → 0007, then `seed.sql`.                                                                                               |
| `permission denied for function create_order`                       | Expected for anon/authenticated users. It's called only with the **service role** key; check `SUPABASE_SERVICE_ROLE_KEY` is set on the server.          |
| Admin panel redirects me to the home page                           | Your profile isn't staff or admin. Run `update public.profiles set role='admin' where email='you@…';` and sign in again.                                |
| Products I created don't show on the store                          | Check the status is _Published_, the schedule date isn't in the future, and at least one colour has stock (otherwise it shows "Sold out").              |
| Images fail to upload: "new row violates row-level security policy" | You're not signed in as staff, or the storage migration (`0005`) wasn't run. Check Supabase → Storage shows the three buckets.                          |
| Images upload but don't display                                     | The image host must match `*.supabase.co` (already allowed in `next.config.ts`). If you use a custom storage domain, add it to `images.remotePatterns`. |
| "pg_cron is not available" notice                                   | Enable pg_cron in Database → Extensions, then run `0007_cron.sql` again. The daily Vercel cron covers the same jobs in the meantime.                    |
| Dashboard numbers look out of date                                  | Analytics views refresh every 15 minutes. Click **Refresh data** on the Analytics page.                                                                 |
| I want to remove the sample orders and visitors                     | Run the two `delete` lines at the top of `supabase/seed-demo-analytics.sql`.                                                                            |

## Sign-in

| Problem                                       | Fix                                                                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email links open `localhost` on the live site | Supabase → Authentication → URL Configuration: set the **Site URL** to your domain and add `https://your-domain/auth/callback` to Redirect URLs.                 |
| "That link has expired"                       | Links work once and expire after an hour. Request a new one. Some email apps pre-open links; using the PKCE flow (the default here) avoids most of these issues. |
| Google sign-in error `redirect_uri_mismatch`  | In Google Cloud, the authorised redirect URI must be exactly `https://YOUR-REF.supabase.co/auth/v1/callback`.                                                    |
| Phone OTP says "isn't enabled"                | Turn on the Phone provider and connect an SMS service in Supabase, or leave it off. Email sign-in always works.                                                  |
| No confirmation or reset emails arrive        | Supabase's built-in email is limited to a few per hour. Set up Resend SMTP (SETUP §7). Check spam.                                                               |

## Payments

| Problem                                                  | Fix                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Online payments aren't configured yet"                  | Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` and restart or redeploy.                                                                                                                                                                                                                                     |
| The Razorpay window doesn't open                         | A browser extension or ad-blocker may be blocking `checkout.razorpay.com`. Try a private window. The site's security headers already allow Razorpay.                                                                                                                                                                     |
| The customer paid, but the order says "Awaiting payment" | Open **Admin → Payments**. If the webhook log is empty, the webhook isn't set up. If it says "Invalid signature", `RAZORPAY_WEBHOOK_SECRET` doesn't match the secret in Razorpay. Paid orders that were auto-released are re-reserved automatically, or flagged in internal notes as "refund required" if stock ran out. |
| Webhook returns 400                                      | Invalid signature: the secrets differ. Fix it, then use Razorpay → Webhooks → resend the event.                                                                                                                                                                                                                          |
| A refund failed                                          | The admin shows Razorpay's reason (for example insufficient balance in the Razorpay account). Refunds need a captured payment.                                                                                                                                                                                           |
| Test vs live mixed up                                    | Live payments need `rzp_live_…` keys **and** a webhook created in Live Mode.                                                                                                                                                                                                                                             |

## Emails

| Problem                                                           | Fix                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No emails at all, and the logs show `[email:dev]`                 | `RESEND_API_KEY` isn't set.                                                                                                                                                                            |
| Resend error "You can only send testing emails to your own email" | Verify your domain in Resend, then set `EMAIL_FROM` to an address at that domain.                                                                                                                      |
| Emails go to spam                                                 | Add the SPF, DKIM and DMARC records ([DEPLOYMENT §6](DEPLOYMENT.md#6-verify-your-email-domain-in-resend-spfdkim)) and wait for them to verify.                                                         |
| Abandoned-cart emails never send                                  | They need `CRON_SECRET` set in Vercel and the cron enabled (Vercel → Settings → Cron Jobs). They go only to carts that have an email (signed-in shoppers, or those who typed their email at checkout). |

## Store behaviour

| Problem                                                       | Fix                                                                                                                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A change in the admin doesn't appear                          | Admin saves refresh the store instantly. If you edited the database directly in Supabase, call `POST /api/revalidate` with `Authorization: Bearer <REVALIDATE_SECRET>`, or wait up to an hour. |
| The contact form says "You've sent several messages recently" | The rate limit is 4 messages per 15 minutes per visitor. Wait, or test from another network.                                                                                                   |
| Pincode check shows only an estimate without the city         | The India Post lookup timed out. The estimate still works from the pincode's zone.                                                                                                             |
| The map on the Contact page is empty                          | The map loads when it scrolls into view. Check `map_lat` / `map_lng` in Admin → Settings → Store information.                                                                                  |

Still stuck? Check **Vercel → Project → Logs** (server errors) and **Supabase → Logs**. The error message there usually names the exact problem.
