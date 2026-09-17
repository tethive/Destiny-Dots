# Destiny Dots — production setup guide

Everything you need to take the app from local development to a live site, with click-by-click steps for every key.
Budget about **2–3 hours** the first time. All services below have free tiers that are enough to launch.

**How to use this guide:** work through the sections in order. Each one ends with the exact environment variables to add. Put them in
**Vercel → your project → Settings → Environment Variables** (select *Production*, and *Preview* if you want test deployments to work).
Keep a copy in a password manager — never paste secrets into chats, email or Git.

> In production the app **refuses to start** if a required key is missing and prints the list of missing keys in the Vercel logs.
> Admin → **Settings** shows a green tick next to each integration once it's configured.

| § | Service | Needed for | Cost to start |
|---|---|---|---|
| 0 | Domain + GitHub + Vercel | Hosting | Domain ≈ ₹800/yr, Vercel Hobby free |
| 1 | Neon | Database | Free (0.5 GB) |
| 2 | Razorpay (optional at launch) | Payments, subscriptions, refunds | 2% per transaction |
| 3 | Resend | All emails | Free (3,000/month) |
| 4 | Cloudflare Turnstile | Bot protection | Free |
| 5 | Cloudflare R2 | PDFs, videos, marketplace files | Free (10 GB) |
| 6 | Generated secrets | Encryption, cron | Free |
| 7 | Google Cloud (optional) | "Continue with Google" | Free |
| 8 | Adzuna / Jooble (optional) | More job listings | Free |
| 9 | Deploy & go-live checklist | | |

---

## 0. Domain, GitHub and Vercel

1. **Buy a domain** (e.g. `destinydots.com`) from Cloudflare Registrar, GoDaddy, Hostinger or Namecheap.
   Tip: Cloudflare Registrar sells at cost and makes §3–§5 easier because DNS is in the same dashboard.
2. **Put the code on GitHub:** create a *private* repository at <https://github.com/new>, then in the project folder:
   ```bash
   git init
   git add .
   git commit -m "Destiny Dots"
   git branch -M main
   git remote add origin https://github.com/<you>/destiny-dots.git
   git push -u origin main
   ```
   `.env` and `.storage/` are already git-ignored.
3. **Create the Vercel project:** <https://vercel.com/signup> → *Continue with GitHub* → **Add New… → Project** → import the repository.
   Leave the build settings as detected (the repo's `vercel.json` runs database migrations before each build). **Don't deploy yet** — click
   *Environment Variables* first and add the keys from the sections below, or deploy once and redeploy after adding them.
4. **Connect the domain:** Vercel project → **Settings → Domains** → add `destinydots.com` and `www.destinydots.com`, then add the DNS records
   Vercel shows at your registrar. HTTPS certificates are issued automatically.
5. Set the site URLs (use your real domain, `https`, no trailing slash):
   ```
   BETTER_AUTH_URL=https://destinydots.com
   NEXT_PUBLIC_SITE_URL=https://destinydots.com
   BETTER_AUTH_SECRET=<run: npm run gen:secret>
   ADMIN_EMAILS=info.destinydots@gmail.com
   ```

> **Cron schedules:** Vercel Hobby runs each cron job once a day, which is what `vercel.json` is configured for. Upgrade to Pro only if you
> want imports more often.

---

## 1. Database — Neon Postgres

1. Sign up at <https://neon.tech> (GitHub login is fine).
2. **Create project** → name `destiny-dots`, Postgres 17, region **AWS Asia Pacific (Singapore)** — closest to India.
3. On the project dashboard click **Connect**. Copy the connection string **twice**:
   - with **Connection pooling ON** — host contains `-pooler`, e.g. `postgresql://neondb_owner:••••@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   - with **Connection pooling OFF** — the same string without `-pooler` (used only for migrations)
4. Add both to Vercel:
   ```
   DATABASE_URL=<pooled connection string>
   DIRECT_URL=<direct connection string>
   ```
5. **Create the tables and starter data** from your computer (one time):
   ```bash
   # PowerShell: $env:DIRECT_URL="<direct>"; $env:DATABASE_URL="<direct>"; npx prisma migrate deploy; npm run db:seed:production
   DIRECT_URL="<direct connection string>" npx prisma migrate deploy
   DATABASE_URL="<direct connection string>" npm run db:seed:production
   ```
   The production seed adds plans, prices, all 28 path/dot outlines and 14 certification guides — **as unpublished drafts**, with no
   sample links and no demo accounts. Later deploys apply new migrations automatically.

> Do **not** run `npm run db:seed` (the development seed) against production.

---

## 2. Payments — Razorpay

> **Optional at launch.** Without Razorpay keys the site runs normally and every purchase button shows
> "Payments are opening soon". Add all three keys together when you are ready — a partial setup is rejected at startup.

### 2a. Account and test keys (do this first)
1. Sign up at <https://dashboard.razorpay.com/signup> with the business email and phone.
2. The dashboard opens in **Test Mode** (toggle at the top). Go to **Account & Settings → API Keys → Generate Key**.
3. Copy the **Key ID** (`rzp_test_…`) and **Key Secret** (shown only once — download the file).
4. **Webhook:** **Account & Settings → Webhooks → + Add New Webhook**
   - Webhook URL: `https://destinydots.com/api/webhooks/razorpay`
   - Secret: create a long random string (`npm run gen:secret`) and keep it
   - Alert email: `info.destinydots@gmail.com`
   - Active events — tick exactly these:
     `order.paid`, `payment.failed`, `refund.processed`, `subscription.activated`, `subscription.charged`,
     `subscription.halted`, `subscription.cancelled`, `subscription.completed`
5. Enable subscriptions: **Subscriptions** in the left menu → follow the prompt to enable (test mode is instant).
6. Add to Vercel:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=<the webhook secret you created>
   ```
   You **don't** need plan IDs — the app creates the ₹299 monthly and ₹1,999 yearly plans in Razorpay the first time someone subscribes,
   and creates new ones automatically if you change prices in Admin → Settings.
7. Test on the live site: buy a dot unlock using Razorpay's test cards/UPI (<https://razorpay.com/docs/payments/payments/test-card-upi-details/>).
   UPI ID `success@razorpay` always succeeds. Within a few seconds the dot unlocks, a receipt email arrives and the invoice appears under **Invoices**.

### 2b. Going live (needs KYC — start early, it can take a few days)
1. Dashboard → **Activate account** and submit business details: PAN, bank account, business type (individual/proprietor is fine),
   and your website. Razorpay checks that the site shows **Terms, Privacy policy, Refund & cancellation policy, Contact details and
   pricing** — all of these pages already exist; have the legal pages reviewed first.
2. After approval, switch the dashboard to **Live Mode** and repeat steps 2–5 (live keys, a live webhook with the same URL and events).
3. Replace the three `RAZORPAY_*` values in Vercel with the live ones and redeploy.

> The local payment simulator is automatically disabled in production and whenever Razorpay keys are present.

---

## 3. Email — Resend

1. Sign up at <https://resend.com>.
2. **Domains → Add Domain** → enter `destinydots.com` (or a subdomain like `mail.destinydots.com`), region **Tokyo (ap-northeast-1)**.
3. Resend shows DNS records (MX, TXT/SPF and DKIM). Add each one at your DNS provider exactly as shown, then click **Verify**.
   On Cloudflare DNS, set the records to **DNS only** (grey cloud). Verification usually takes minutes.
4. Recommended: also add a DMARC record — TXT on `_dmarc` with value `v=DMARC1; p=none; rua=mailto:info.destinydots@gmail.com`.
5. **API Keys → Create API Key** → permission *Sending access*, domain `destinydots.com`. Copy the key (`re_…`).
6. Add to Vercel:
   ```
   RESEND_API_KEY=re_...
   EMAIL_FROM=Destiny Dots <noreply@destinydots.com>
   CONTACT_INBOX=info.destinydots@gmail.com
   ```
7. What gets sent: email verification, welcome, password reset, password changed, contact form (to you with *reply-to* the sender, plus a
   confirmation to the sender), payment receipts, renewals, failed payments, cancellations, refunds, and marketplace emails (listing
   approved/changes needed, sales, payouts, disputes).

> With email configured, **new email/password accounts must confirm their email before logging in** (Google accounts are already verified).

---

## 4. Bot protection — Cloudflare Turnstile

1. Sign up / log in at <https://dash.cloudflare.com> (a Cloudflare account is free; your domain doesn't need to be on Cloudflare).
2. Left menu **Turnstile → Add widget**.
   - Widget name: `Destiny Dots`
   - Hostnames: `destinydots.com`, `www.destinydots.com` (add `localhost` if you want to test locally)
   - Widget mode: **Managed**
3. Copy the **Site Key** and **Secret Key**.
4. Add to Vercel:
   ```
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAA...
   TURNSTILE_SECRET_KEY=0x4AAAA...
   ```
   Protects sign-up, log-in, password reset and the contact form. Most people never see a challenge.

---

## 5. File storage — Cloudflare R2

Used for PDFs/videos you upload as resources and for marketplace covers, screenshots and source ZIPs. Files are private; the app checks
access before serving anything.

1. Cloudflare dashboard → **R2 Object Storage**. First time: add a payment method (required even for the free tier; 10 GB and egress are free).
2. **Create bucket** → name `destiny-dots-files`, location **Automatic** (or *Asia-Pacific*). Leave public access **disabled**.
3. Open the bucket → **Settings → CORS policy → Add CORS policy**, paste and save (lets browsers upload directly):
   ```json
   [
     {
       "AllowedOrigins": ["https://destinydots.com", "https://www.destinydots.com"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. Back on the R2 overview → **Manage R2 API Tokens → Create API token**
   - Permissions: **Object Read & Write**
   - Specify bucket: `destiny-dots-files` only
   - Create, then copy **Access Key ID**, **Secret Access Key** and the **S3 endpoint** (`https://<account-id>.r2.cloudflarestorage.com`).
5. Add to Vercel:
   ```
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=destiny-dots-files
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   ```
   (AWS S3 also works: use `https://s3.ap-south-1.amazonaws.com`, region `ap-south-1`, and an IAM user limited to that bucket.)

---

## 6. Generated secrets

Run this three times and use a different output for each:
```bash
npm run gen:secret
```
```
BETTER_AUTH_SECRET=<output 1>   # if not already set in §0
ENCRYPTION_KEY=<output 2>       # encrypts seller bank/UPI details — never change it after sellers sign up
CRON_SECRET=<output 3>          # Vercel sends this to the scheduled jobs automatically
```
Store `ENCRYPTION_KEY` in your password manager: if it's lost, saved payout details can't be decrypted (sellers would re-enter them).

---

## 7. Google sign-in (optional)

1. Open <https://console.cloud.google.com> → project picker → **New project** → `Destiny Dots`.
2. **APIs & Services → OAuth consent screen** → *Get started*
   - App name `Destiny Dots`, support email `info.destinydots@gmail.com`
   - Audience **External**, contact email, agree → Create
   - **Branding:** add the logo, home page `https://destinydots.com`, privacy `https://destinydots.com/privacy`, terms `https://destinydots.com/terms`,
     authorised domain `destinydots.com`
   - **Audience → Publish app** (so anyone can sign in — basic email/profile scopes don't need Google's review)
3. **APIs & Services → Credentials → + Create credentials → OAuth client ID**
   - Application type **Web application**, name `Destiny Dots web`
   - Authorised JavaScript origins: `https://destinydots.com`
   - Authorised redirect URIs: `https://destinydots.com/api/auth/callback/google`
     (for local testing also add `http://localhost:3000` and `http://localhost:3000/api/auth/callback/google`)
4. Copy the Client ID and Client secret:
   ```
   GOOGLE_CLIENT_ID=....apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```
   The "Continue with Google" buttons appear automatically once these are set.

---

## 8. Job & news imports (optional keys)

Works immediately without keys: **Remotive** (remote jobs), **DEV Community**, **Hacker News** and the RSS feeds (AWS, Google Cloud,
The Hacker News, GitHub — editable in Admin → Content → Auto-imports). For more India-based jobs add:

**Adzuna** (recommended for India)
1. Register at <https://developer.adzuna.com/signup>.
2. After confirming your email, open **Dashboard → API access details** and copy the **Application ID** and **Application Key**.
   ```
   ADZUNA_APP_ID=...
   ADZUNA_APP_KEY=...
   ```

**Jooble**
1. Request a key at <https://jooble.org/api/about> (fill in the form with your site URL; the key arrives by email).
   ```
   JOOBLE_API_KEY=...
   ```

Imported items wait in **Admin → Content → Auto-imports** for approval (turn on *Auto-publish* there once you trust the sources). Jobs link
to the employer's application page and news shows a short summary with a link to the full article — full articles aren't copied, which keeps
you on the right side of publishers' copyright.

---

## 9. Deploy and go-live checklist

1. In Vercel → **Deployments → Redeploy** (or push to `main`). The build runs `prisma migrate deploy` then `next build`.
2. If the site shows an error, open the deployment → **Logs**; a missing key is listed by name.
3. **Sign up with `info.destinydots@gmail.com`** on the live site → confirm the email → you land in the admin panel.
4. Admin → **Settings**: check every integration shows a green tick, fill in **Business details** (legal name, address; add GSTIN when registered).
5. Admin → **Security**: review the checklist.
6. Content before announcing:
   - [ ] Add real resources (links or uploaded PDFs/videos) to each path's dots, then **publish** the paths
   - [ ] Review and publish the certification guides; attach study resources to each
   - [ ] Approve imported jobs and updates (or post your own)
   - [ ] Add social links in `src/lib/site.ts` → `contactConfig.socials`
   - [ ] Have Terms, Privacy and Refund policy reviewed, then remove the draft wording
7. Payments:
   - [ ] Full test purchase in Razorpay **test** mode (dot unlock, Pro subscription, refund from Admin → Payments)
   - [ ] Complete Razorpay KYC and switch to **live** keys (§2b)
   - [ ] Make one small live purchase and refund it
8. Marketplace:
   - [ ] Review marketplace rules in Admin → Marketplace → Settings (10% commission, 7-day protection, ₹500 minimum payout)
   - [ ] Payouts are manual: Admin → Marketplace → Payouts → *Prepare payout* → pay via your bank/UPI app → *Mark paid* with the UTR
9. Monitoring (recommended): enable **Vercel Analytics** and add an uptime monitor (e.g. UptimeRobot, free) for `https://destinydots.com`.
10. Backups: Neon keeps point-in-time history (24 hours free, longer on paid plans). Consider upgrading before you have many paying users.

### Where each thing is configured

| Change | Where |
|---|---|
| Prices | Admin → Settings → Pricing (Razorpay plans update automatically) |
| Invoice business details / GSTIN | Admin → Settings → Business details |
| Marketplace commission, protection days, payouts | Admin → Marketplace |
| Import sources, auto-publish, RSS feeds | Admin → Content → Auto-imports |
| Contact details, social links | `src/lib/site.ts` |
| Admin accounts | `ADMIN_EMAILS`, or Admin → Users → user → role |

### Security notes
- Prisma parameterises every query (SQL injection); React escaping + Markdown without raw HTML + a nonce-based CSP (XSS); origin checks on
  every server action and auth call (CSRF); `frame-ancestors 'none'` (clickjacking); HSTS and secure cookies (HTTPS).
- Rate limits are stored in Postgres so they work across serverless instances; Turnstile adds bot protection; breached passwords are rejected.
- Access to paid content is granted only by signature-verified, de-duplicated Razorpay webhooks — never by the browser.
- Uploaded files are private, type-checked by their bytes, size-limited, served with `Content-Security-Policy: sandbox`.
- Seller bank/UPI details are encrypted (AES-256-GCM); every admin view of them is audit-logged.
- `npm audit` reports advisories in the **Prisma CLI's** optional MySQL driver and config loader. They are build-time tools, not part of the
  running app (which uses PostgreSQL); upgrade Prisma when a patched release is available.

## 10. Running the site

- **Usage & limits** (Admin → System → Usage & limits): emails, file storage, database size, background jobs and import calls, compared with each service's free-plan limits. When any meter reaches the warning level (80% by default), the nightly maintenance job emails the admin inbox once that day. Change the limits there when you upgrade a plan. Counting starts from the release that added the page.
- **Maintenance mode**: add `MAINTENANCE_MODE` = `1` in Vercel and redeploy. Visitors see a maintenance page (HTTP 503); `/admin` and sign-in stay reachable. Remove the variable and redeploy to reopen.
- **Admin access**: the admin area returns "page not found" to anyone who isn't signed in as an admin on that browser. To open it, log in at `/login` with the admin account. You land in the admin panel, and the "Admin" button in the student app works too. Signing out hides it again. Bookmarked `/admin` links show "page not found" until you log in.
- **Student accounts**: students can pause their account (Settings → Account); signing in again reactivates it. They can also delete it. Deleting removes their personal data, but invoices and payment records are kept for tax purposes. Admins see "Paused" or "Deleted by user" labels in Users.
