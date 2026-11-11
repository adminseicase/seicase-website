# Deployment guide: put seicase online

You'll host the website on **Vercel** and the database on **Supabase Cloud**. Allow about an hour, plus waiting time for DNS and Razorpay approval.

---

## 1. Push the code to GitHub

```bash
git add -A
git commit -m "seicase store"
git push origin main
```

Your repository is `github.com/adminseicase/seicase-website`. Keep it **private**.

## 2. Import into Vercel

1. Sign up at https://vercel.com with your GitHub account.
2. Click **Add New → Project**, choose `seicase-website`, then **Import**.
3. The framework is detected as Next.js, so leave the build settings as they are.
4. Open **Environment Variables** and add **every variable from `.env.example`**, using your real values:

| Variable                                                                                 | Production value                                                 |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                                                   | `https://www.seicase.com` (your final domain, no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API                                   |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`                                     | test keys first, live keys at launch                             |
| `RAZORPAY_WEBHOOK_SECRET`                                                                | the secret you set in step 4                                     |
| `RESEND_API_KEY`, `EMAIL_FROM`                                                           | from Resend (`seicase <hello@seicase.com>`)                      |
| `CRON_SECRET`, `REVALIDATE_SECRET`, `IP_HASH_SALT`                                       | long random strings                                              |

5. Click **Deploy**. After a couple of minutes you'll get a `…vercel.app` address. Open it and check the store loads.

> Whenever you change an environment variable, redeploy: **Deployments → ⋯ → Redeploy**.

`vercel.json` already sets the region to **Mumbai (bom1)** and a daily job at 09:00 IST (`/api/cron/daily`). Vercel sends `CRON_SECRET` automatically.

## 3. Connect your domain (with SSL)

1. Vercel → Project → **Settings → Domains → Add** `seicase.com`, and add `www.seicase.com` too.
2. Vercel shows the DNS records to create. At your domain registrar (GoDaddy, Namecheap, Hostinger…), open **DNS settings** and add:

| Type    | Name / Host | Value                  | What it does                       |
| ------- | ----------- | ---------------------- | ---------------------------------- |
| `A`     | `@`         | `76.76.21.21`          | points `seicase.com` to Vercel     |
| `CNAME` | `www`       | `cname.vercel-dns.com` | points `www.seicase.com` to Vercel |

Use the exact values Vercel displays if they differ. Remove any old `A` or `CNAME` records for `@` and `www`. 3. Wait 5–60 minutes. Vercel then issues a free SSL certificate automatically (the padlock appears). 4. Choose which version is primary (we recommend `www.seicase.com`, with `seicase.com` redirecting to it), then make `NEXT_PUBLIC_SITE_URL` match and redeploy.

## 4. Razorpay webhook and live keys

**Webhook** (the backup that confirms payments even if a customer closes the tab):

1. Razorpay Dashboard → **Account & Settings → Webhooks → Add New Webhook**.
2. Webhook URL: `https://www.seicase.com/api/razorpay/webhook`
3. Secret: type a long random string, and put the same value in Vercel as `RAZORPAY_WEBHOOK_SECRET`.
4. Active events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
5. Place a test order, then open **Admin → Payments**. The webhook log at the bottom should show "Processed".

**Going live**:

1. Complete KYC in Razorpay (business documents, bank account). Approval usually takes 2–5 working days.
2. Switch the dashboard to **Live Mode → API Keys → Generate Live Key**.
3. Replace both Razorpay variables in Vercel with the `rzp_live_…` key and its secret.
4. Create the webhook again in **Live Mode** (test and live webhooks are separate).
5. Redeploy, then make a real ₹10 purchase (a coupon helps) and refund it from **Admin → Orders**.

## 5. Update Supabase for production

1. Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://www.seicase.com`
   - Redirect URLs: add `https://www.seicase.com/auth/callback` (keep the localhost one for development).
2. Google login: in Google Cloud, add your domain under **Authorised JavaScript origins**.
3. **Database → Extensions → pg_cron**: enable it and run `20261110000007_cron.sql` once more.
4. **Authentication → Emails → SMTP**: use Resend (see SETUP §7) so customers get emails from your domain.
5. Consider turning on **Leaked password protection** in Authentication → Settings.

## 6. Verify your email domain in Resend (SPF/DKIM)

1. Resend → **Domains → Add Domain** → `seicase.com`.
2. Resend shows 3–4 DNS records. Add them at your registrar exactly as shown:
   - **MX** `send` → `feedback-smtp.ap-northeast-1.amazonses.com` (the region may differ): lets bounces be handled.
   - **TXT** `send` → `v=spf1 include:amazonses.com ~all` (**SPF**): proves Resend may send for you.
   - **TXT** `resend._domainkey` → a long `p=…` key (**DKIM**): signs your emails so they aren't marked as spam.
   - _(Recommended)_ **TXT** `_dmarc` → `v=DMARC1; p=none; rua=mailto:hello@seicase.com`.
3. Click **Verify** (it can take up to an hour). Then set `EMAIL_FROM=seicase <hello@seicase.com>` in Vercel and redeploy.

## 7. Go-live checklist

- [ ] Store info, GSTIN, phone and address are correct (**Admin → Settings**)
- [ ] Shipping rules and COD settings are right; the return window says 15 days
- [ ] Real product photos uploaded; sample products archived or deleted
- [ ] Optional demo analytics deleted (commands at the top of `supabase/seed-demo-analytics.sql`)
- [ ] Policy pages reviewed by you (Privacy, Terms, Shipping, Returns)
- [ ] Razorpay **live** keys and **live** webhook set; a real payment has been made and refunded
- [ ] Order, shipping and welcome emails arrive in your inbox, not spam (**Admin → Settings → Email templates**)
- [ ] Supabase redirect URLs and Site URL use your domain; Google login works
- [ ] pg_cron is enabled (or you've confirmed the daily Vercel job runs: Vercel → Logs)
- [ ] At least two admins exist, so you're never locked out
- [ ] `https://www.seicase.com/sitemap.xml` loads; submit it in Google Search Console
- [ ] Run Lighthouse on the live site (Chrome DevTools → Lighthouse → Mobile)

## 8. Backups and safety

- **Database**: Supabase's free plan keeps daily backups for a short period, and Pro keeps 7 days of daily backups (add Point-in-Time Recovery if needed). As an extra copy, export weekly from the admin panel (Orders, Products and Customers CSVs), or run:
  ```bash
  npx supabase db dump --linked -f backup-$(date +%F).sql
  ```
  Store copies off-site, for example in Google Drive.
- **Photos**: they live in Supabase Storage and are covered by your Supabase plan. Keep your original high-resolution photos too.
- **Code**: GitHub is your backup. Vercel can roll back to any earlier deployment in one click (**Deployments → ⋯ → Promote**).
- **Secrets**: if a key ever leaks, rotate it (Supabase → API → Reset service_role key; Razorpay → regenerate keys), update Vercel, and redeploy.
