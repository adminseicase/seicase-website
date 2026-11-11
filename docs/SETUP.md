# Setup guide: run seicase on your computer

This takes about 45 minutes the first time. You don't need to be a developer: follow the steps in order and copy commands exactly. Wherever you see `Terminal`, use **Command Prompt / PowerShell** on Windows or **Terminal** on Mac.

---

## 1. Install the tools (one time)

| Tool                          | Download                      | Check it worked                  |
| ----------------------------- | ----------------------------- | -------------------------------- |
| **Node.js 20 or newer** (LTS) | https://nodejs.org            | `node -v` shows `v20…` or higher |
| **Git**                       | https://git-scm.com/downloads | `git --version`                  |
| A code editor (optional)      | https://code.visualstudio.com | —                                |

`npm` comes with Node.js. If you prefer `pnpm`, run `npm i -g pnpm` and use `pnpm` wherever this guide says `npm`.

## 2. Get the code and install packages

```bash
git clone https://github.com/adminseicase/seicase-website.git
cd seicase-website
npm install
```

> **Tip (Windows):** keep the project outside OneDrive-synced folders if `npm install` is very slow or files seem to change on their own. OneDrive sometimes locks files while syncing.

You can already try the store in demo mode:

```bash
npm run dev
```

Open http://localhost:3000. You'll see the full sample catalogue. Checkout, accounts and the admin panel need Supabase, which is the next step.

## 3. Create a Supabase project

1. Sign up at https://supabase.com and click **New project**.
2. Name it `seicase`, choose a strong database password (save it somewhere safe), and pick the region **South Asia (Mumbai)**.
3. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ This is a master key. Never share it or put it in a `NEXT_PUBLIC_` variable.

## 4. Create your `.env.local` file

```bash
cp .env.example .env.local      # Windows PowerShell: copy .env.example .env.local
```

Open `.env.local` and paste the three Supabase values. Every variable is explained in the file. For now you can leave Razorpay and Resend empty.

## 5. Create the database (tables, security, sample data)

Pick **one** of the two options.

### Option A: copy and paste (easiest)

1. In Supabase, open **SQL Editor → New query**.
2. Open each file in `supabase/migrations/` **in order** (`…0001…` through `…0007…`). Paste its contents and click **Run**. Each one should say "Success".
   - `0007_cron.sql` may show a notice that pg_cron isn't enabled. That's fine; see step 8.
3. Paste and run `supabase/seed.sql`. This loads 16 products, categories, styles, charms, hero slides, FAQs, pages, journal posts, two coupons and default settings.
4. _(Optional)_ Run `supabase/seed-demo-analytics.sql` to fill the dashboard with 90 sample orders and visitor data, so you can explore the reports. You can delete it later; the commands are at the top of that file.

### Option B: Supabase CLI

```bash
npx supabase login
npx supabase init            # answer "N" to the optional questions; it won't touch the migrations
npx supabase link --project-ref YOUR-PROJECT-REF   # the part before .supabase.co in your URL
npx supabase db push         # runs every migration
npx supabase db execute --file supabase/seed.sql   # or paste seed.sql in the SQL Editor
```

> The migrations also create the **storage buckets** (`product-images` and `cms-images`, both public, and `invoices`, which is private) and their security rules. Check **Storage** in Supabase: you should see all three. If not, run `20261110000005_storage.sql` again.

Restart the dev server (`Ctrl + C`, then `npm run dev`). The store now reads from your database.

## 6. Create the first admin user

1. Go to http://localhost:3000/signup and create your own account.
2. Confirm the email (check your inbox; while testing, you can also turn off email confirmation in Supabase → **Authentication → Sign In / Providers → Email → Confirm email**).
3. In Supabase **SQL Editor**, run this with your email:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

4. Open http://localhost:3000/admin. You're in. After this, you can add staff from **Admin → Settings → Team & roles** without SQL.

## 7. Sign-in providers and auth emails

**Redirect URLs** (required): Supabase → **Authentication → URL Configuration**

- Site URL: `http://localhost:3000` (change this to your domain at launch)
- Redirect URLs: add `http://localhost:3000/auth/callback`

**Google login** (optional)

1. In https://console.cloud.google.com, create a project, then go to **APIs & Services → Credentials → Create credentials → OAuth client ID** (type: Web application).
2. Authorised redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Copy the Client ID and Secret into Supabase → **Authentication → Providers → Google**, and enable it.

**Phone OTP** (optional): Supabase → Authentication → Providers → Phone. Connect an SMS provider (for example Twilio or MessageBird). If you leave it off, the phone tab simply tells customers to use email.

**Branded auth emails**: Supabase → **Authentication → Emails → Templates**. Paste the files from `supabase/templates/` into _Confirm signup_, _Magic Link_ and _Reset Password_. To send them from your own domain, go to **Authentication → Emails → SMTP Settings** and use Resend's SMTP details (host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key).

## 8. Scheduled jobs (pg_cron)

Supabase → **Database → Extensions** → enable **pg_cron**. Then run `supabase/migrations/20261110000007_cron.sql` again. This schedules:

- releasing unpaid online orders after 45 minutes (their stock goes back on sale),
- marking carts abandoned after 1 hour,
- refreshing analytics every 15 minutes,
- cleaning up rate-limit records hourly.

If you can't enable pg_cron, the daily Vercel job (`/api/cron/daily`) runs the same tasks once a day.

## 9. Razorpay test payments

1. Sign up at https://dashboard.razorpay.com. You'll start in **Test Mode**.
2. Go to **Account & Settings → API Keys → Generate Test Key**.
3. In `.env.local`:
   ```
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_…
   RAZORPAY_KEY_SECRET=…
   ```
4. Restart the server and place an order. In the payment window, use test UPI `success@razorpay`, or the test card `4111 1111 1111 1111` with any future date and any CVV.

Webhooks need a public URL, so you'll set them up when deploying ([DEPLOYMENT.md](DEPLOYMENT.md#4-razorpay-webhook-and-live-keys)). Locally, payments are confirmed by the signature check in the browser flow, which works without webhooks.

## 10. Emails with Resend

1. Sign up at https://resend.com and go to **API Keys → Create** → put the key in `RESEND_API_KEY`.
2. Until you verify your domain, Resend only delivers to your own email address. Set `EMAIL_FROM=seicase <onboarding@resend.dev>` for testing.
3. Without a key, emails are printed in the terminal window instead (look for `[email:dev]`). Nothing breaks.
4. To check each template: **Admin → Settings → Email templates → Send "…"**. To preview the designs locally, run `npm run email:preview`.

## 11. Useful commands

| Command                              | What it does                                                  |
| ------------------------------------ | ------------------------------------------------------------- |
| `npm run dev`                        | Start the development server                                  |
| `npm run build` then `npm start`     | Production build and run it locally                           |
| `npm run typecheck` / `npm run lint` | Check the code for errors                                     |
| `npm run format`                     | Tidy the code formatting                                      |
| `npm run analyze`                    | Explore JavaScript bundle sizes                               |
| `npm run images:generate`            | Re-create the sample product artwork                          |
| `npm run db:seed:generate`           | Re-create `supabase/seed.sql` from `lib/demo/seed-data.ts`    |
| `npm run db:types`                   | Re-generate database TypeScript types (after `supabase link`) |

Something not working? See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
