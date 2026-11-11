# Running costs

These are typical prices as of late 2026, in US dollars where the provider bills in USD (₹ figures are approximate at ~₹84/$). Prices change, so **check each provider's pricing page before you decide**. GST or other taxes may be added.

## Summary

| Stage                                   | Vercel                          | Supabase             | Resend                      | Razorpay                     | Domain                      | Approx. monthly total              |
| --------------------------------------- | ------------------------------- | -------------------- | --------------------------- | ---------------------------- | --------------------------- | ---------------------------------- |
| **Testing / soft launch**               | Hobby: free                     | Free                 | Free                        | Per transaction only         | ~₹70–100/mo (₹800–1,200/yr) | **≈ ₹100 + payment fees**          |
| **Launched store (recommended)**        | Pro: ~$20 (≈ ₹1,700) per member | Pro: ~$25 (≈ ₹2,100) | Free or Pro ~$20 (≈ ₹1,700) | Per transaction only         | ~₹100                       | **≈ ₹3,900–5,600 + payment fees**  |
| **Growing (lots of traffic and email)** | Pro + usage                     | Pro + compute add-on | Pro / Scale                 | Per transaction (negotiable) | ~₹100                       | **≈ ₹6,000–12,000 + payment fees** |

## Details

### Vercel (website hosting)

- **Hobby (free)**: fine for testing. Its terms are for **non-commercial** use, and cron jobs run at most once a day (enough for this project's daily job).
- **Pro (~$20 per team member per month)**: needed for a commercial store. It includes generous bandwidth and function usage; a boutique store usually stays within the included limits. Image optimization and extra bandwidth are billed only above the included usage.

### Supabase (database, logins, photo storage)

- **Free**: 500 MB database, 1 GB file storage, 50,000 monthly active users. Projects **pause after a week of inactivity** and backups are limited, so this suits testing only.
- **Pro (~$25 per month)**: 8 GB database, 100 GB storage, daily backups (7 days), no pausing, and pg_cron. This is the recommended plan for a live store. Extra storage or compute is billed separately and is rarely needed at the start.

### Resend (transactional emails)

- **Free**: about 3,000 emails per month (100 per day) and one domain. That covers roughly 500–700 orders a month (confirmation, shipping and delivery emails plus a few reminders).
- **Pro (~$20 per month)**: about 50,000 emails per month and no daily cap.
- Supabase Auth emails (sign-up, password reset) sent through Resend SMTP count towards the same quota.

### Razorpay (payments)

- **No setup or annual fee** on the standard plan.
- **About 2% per successful transaction** for most domestic cards, UPI, netbanking and wallets. Some methods cost more (for example international cards around 3%, Amex and Diners more), and **18% GST applies to the fee**.
- Example: a ₹8,990 Tulip Tote costs about ₹180 + ₹32 GST ≈ ₹212 in fees.
- UPI pricing has changed several times in recent years. Confirm current rates in your Razorpay dashboard after KYC. Rates can be negotiated at higher volumes.
- **COD** has no Razorpay fee, but your courier will charge a COD fee (often ₹30–60 or 1.5–2% per parcel).

### Other (optional)

- **Domain**: `.com` about ₹800–1,200 per year; `.in` is often cheaper.
- **Cloudflare Turnstile** (spam protection): free.
- **Google Analytics 4 / Meta Pixel**: free.
- **SMS for phone OTP** (Twilio, MessageBird…): about ₹0.20–0.80 per SMS, only if you enable phone sign-in.
- **Couriers / Shiprocket**: billed separately by weight and zone. Not part of this software.

## Ways to keep costs low

- Start on the free plans while testing, then move to **Vercel Pro + Supabase Pro** before taking real orders.
- One Vercel team member is enough; add staff as **admin-panel users** (they don't need Vercel seats).
- Images are compressed on upload and served as AVIF/WebP from cache, which keeps bandwidth and storage small.
