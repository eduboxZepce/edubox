# Setting up the platform for a new client

This repo is one client's site, but nothing client-specific is hard-coded in the app. Everything
that differs between clients sits in three places:

| What                                            | Where                              | Who changes it             |
| ----------------------------------------------- | ---------------------------------- | -------------------------- |
| Name, domain, colours, contact, company details | `brand/config.ts`                  | you, in the repo           |
| Logo, landing photo, (optional) share image     | `brand/logo.svg`, `brand/hero.jpg` | you, in the repo           |
| Keys and per-environment settings               | env vars (`.env.local`, Vercel)    | you, in each service       |
| Payment details, legal texts, courses, blog     | the database                       | the client's admin, in-app |

Setting up a new client means: copy the repo, fill in `brand/`, create the outside accounts
(Supabase, Resend, ImprovMX, Google, Vercel), and put their keys into env vars. Do the parts in
order, because later parts need values from earlier ones. Each part ends with a ✅ check.

Keep a password manager entry for the client open the whole time. Several keys are shown
**only once**.

> **Same for every client:** the UI language (Bosnian, ijekavian), the currency (KM / BAM), and
> the starting legal texts, which are written for Bosnia and Herzegovina (they name the Agencija
> za zaštitu ličnih podataka). A client elsewhere needs a lawyer to review those texts, not code
> changes.

---

## What you'll end up with

| Service          | Used for                                            | Free plan enough?      |
| ---------------- | --------------------------------------------------- | ---------------------- |
| **GitHub**       | the client's copy of the code                       | yes                    |
| **Supabase**     | database, sign-in, file storage                     | yes (1 GB storage)     |
| **Vercel**       | hosting, the domain's DNS, the daily cron jobs      | yes (Hobby), see below |
| **Resend**       | sending email (notifications, sign-up confirmation) | yes (~100/day)         |
| **ImprovMX**     | receiving mail at `info@domain` → a Gmail inbox     | yes                    |
| **Google Cloud** | "Sign in with Google"                               | yes                    |

Vercel's Hobby plan is for non-commercial use. A paying client's site should be on **Pro**;
check Vercel's current terms.

---

## Part 1 — Copy the repo

1. On GitHub, create an **empty private repository** for the client (no README, no licence).
2. Clone this repo into a new folder and point it at the new repository:

   ```sh
   git clone <this-repo-url> client-name
   cd client-name
   git remote set-url origin <new-repo-url>
   npm install
   ```

3. Create `.env.local` from the template — you'll fill it in as you go:

   ```sh
   cp .env.example .env.local
   ```

Optional: `src/lib/appVersions.json` carries this codebase's version history. It is harmless to
keep; `npm run versions:init` rebuilds it from the new repo's git history if you'd rather.

✅ **Check:** `git remote -v` shows the new repository.

---

## Part 2 — The brand folder

### 2.1 `brand/config.ts`

Open it and replace every value. Each field is commented; the ones that matter most:

| Field              | Example                                 | Notes                                                                                                                                 |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `url`              | `https://www.akademija.ba`              | The production address. `https`, no trailing slash. If it starts with `www.`, the bare domain redirects to it automatically.          |
| `name`             | `Akademija Mostar`                      | The full brand. Emails, certificate, page titles.                                                                                     |
| `shortName`        | `Akademija`                             | Next to the logo, and the " — Akademija" suffix on every page title.                                                                  |
| `tagline`          | `online obuke sa certifikatom`          | Starts lower-case; shown after the name on the home page and share image.                                                             |
| `colors.primary`   | `{ light: '#e8590c', dark: '#ff922b' }` | `light` must be dark enough for white text on it. `dark` is a lighter tint for dark mode. Button text colour is chosen automatically. |
| `colors.secondary` | `{ light: '#7b3fe4', dark: '#a479ff' }` | Accent, used at the far end of the brand gradients.                                                                                   |
| `hero.alt`         | `Učionica s laptopima`                  | Describes `brand/hero.jpg` for screen readers.                                                                                        |
| `contact.*`        | `info@akademija.ba`, phone, hours       | Public contact details. `contact.email` must be an address you create in Part 5.                                                      |
| `stats`            | `[]`                                    | **Start with `[]`** (hides the band). Don't carry over another client's numbers.                                                      |
| `social`           | `{ label: 'Instagram', href: '' }`      | Empty `href` = not shown.                                                                                                             |
| `company.*`        | legal name, address, ID broj (JIB)      | Footer, emails, and the `{{company.*}}` placeholders in the terms and privacy policy.                                                 |

Picking a dark-mode colour: take the `light` colour and make it noticeably lighter and a bit
more saturated (any colour picker's HSL slider: lightness +15–20%). It only has to read well on
near-black.

### 2.2 The images

| File                 | What to put there                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand/logo.svg`     | **The mark only — no brand name in it.** The name is always set as text next to it. Any aspect ratio, any colours. Must be SVG; if the client only has a PNG, ask their designer for the SVG. |
| `brand/hero.jpg`     | The landing page background photo. Landscape, at least 1600 px wide. `.png` or `.webp` also work. The left part sits behind the text panel, so a busy left half is fine but not ideal.        |
| `brand/og-image.jpg` | **Optional.** A designed 1200×630 share image (what Facebook/LinkedIn/Viber show). Without it, one is generated from the logo, name, tagline and colours.                                     |

Delete the files that belong to the previous client before copying in the new ones.

### 2.3 Generate

```sh
npm run brand
```

It builds the favicon, app icons, email logo, share image, the certificate's logo, and the
Supabase sign-up email from the folder, and prints every file it wrote. Never edit those outputs
by hand; change `brand/` and run it again.

Look at the results before committing: `public/icon-512.png`, `public/email-logo.png`, and the
`og-…jpg` in `public/brand/`. Then:

```sh
npm run check
git add -A && git commit -m "Brand for <client>"
```

✅ **Check:** `npm run dev`, open <http://localhost:3000> — the header shows the new logo and
name, buttons are in the new colour, the browser tab shows the new favicon. (Most of the site
needs Supabase to load data; that comes in Part 4.)

---

## Part 3 — The domain

1. Buy the domain at a registrar (for `.ba`: e.g. Globalhost, Logosoft).
2. Decide where DNS lives. **Recommended: Vercel.** At the registrar, set the nameservers to
   `ns1.vercel-dns.com` and `ns2.vercel-dns.com`. From then on, every DNS record (website,
   email) is added in Vercel → **Domains**, and the registrar's own DNS panel is ignored.

Nameserver changes can take a few hours to spread. Carry on meanwhile; the checks in later parts
will go green once it has.

How to add a DNS record in Vercel, and the most common mistake: see
[email-setup.md, Part 0](email-setup.md#part-0--dns-lives-in-vercel).

---

## Part 4 — Supabase (database, sign-in, files)

### 4.1 Create the project

1. [supabase.com](https://supabase.com) → sign in → **New organization** for the client (keeps
   billing and access separate from your other clients) → **New project**.
2. **Name:** the client's name. **Region:** Central EU (Frankfurt) or West EU (Ireland).
3. **Database password:** click **Generate**, and save it in the password manager **now**.
4. Wait for the project to finish setting up (a minute or two).

### 4.2 Collect the values

| Value                     | Where in Supabase                                                                                     | Put it in `.env.local` as       |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| Project URL               | Project Settings → **Data API** → Project URL (`https://<ref>.supabase.co`)                           | `NEXT_PUBLIC_SUPABASE_URL`      |
| Project ref               | the `<ref>` part of that URL                                                                          | `SUPABASE_PROJECT_REF`          |
| anon / publishable key    | Project Settings → **API Keys** → the **anon** key (Legacy tab) or the **publishable** key            | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role / secret key | same page → **service_role** (Legacy tab) or a **secret** key. **Secret — never share it.**           | `SUPABASE_SERVICE_ROLE_KEY`     |
| Database password         | the one you saved in 4.1 (reset it under Project Settings → Database if lost)                         | `SUPABASE_DB_PASSWORD`          |
| Access token              | your avatar → **Account preferences → Access Tokens** → Generate new token (name it after the client) | `SUPABASE_ACCESS_TOKEN`         |

The access token belongs to _your_ Supabase account, not the project. It is what makes the
`npm run supabase …` commands act as the right account; see `docs/project-context.md` §0 for
why you must never use bare `npx supabase` on a machine that serves several clients.

### 4.3 Create the database

```sh
npm run supabase -- link --project-ref <ref>
npm run db:push
```

`db:push` applies every migration in `supabase/migrations/`: tables, security policies, the
storage buckets, the starting terms and privacy policy, and the starting blog posts. Both texts
are reused for every client: the legal texts use `{{site.name}}`, `{{company.legalName}}`,
`{{contact.email}}` and similar placeholders, which fill in from `brand/config.ts` when the page is
shown.

Do **not** run `npm run db:seed` against a client's real project. It creates test accounts and
demo courses, and deletes them again on every run. It's only for a throwaway development
project.

✅ **Check:** Supabase → **Table Editor** lists `courses`, `profiles`, `blog_posts`, …; **Storage**
lists `course-thumbnails`, `module-files`, `blog-images` and the other buckets.

### 4.4 Sign-in settings

Supabase → **Authentication**:

1. **URL Configuration**
   - **Site URL:** `https://www.<domain>` (the `url` from `brand/config.ts`).
   - **Redirect URLs**, add all three:
     - `https://www.<domain>/**`
     - `http://localhost:3000/**`
     - `https://*-<your-vercel-team>.vercel.app/**` (preview deployments; the team slug is in your
       Vercel dashboard URL)
2. **Sign In / Providers → Email:** enabled, **Confirm email** on.
3. **Emails → Templates → Confirm signup:**
   - **Subject:** `Potvrdite email adresu — <name>` (also printed at the top of the file below)
   - **Body:** paste the whole of `supabase/templates/confirmation.html`, which `npm run brand`
     generated.

Custom SMTP (so these emails come from your domain and aren't capped at a few per hour) is set
in Part 6.3, once Resend exists. Until then, Supabase's built-in mailer only delivers to your
own team's addresses, so test sign-ups won't receive their confirmation email.

---

## Part 5 — Receiving email (ImprovMX)

Follow [email-setup.md, Part 1](email-setup.md#part-1--receiving-improvmx), with the client's
domain and the Gmail address that should receive their mail. Create at least the alias that
matches `contact.email` in `brand/config.ts` (normally `info`).

✅ **Check:** from an account that isn't that Gmail, write to `info@<domain>` → it arrives.

---

## Part 6 — Sending email (Resend)

### 6.1 Verify the domain

Follow [email-setup.md, Part 2](email-setup.md#part-2--sending-verify-the-domain-in-resend). Use a
separate Resend account (or team) per client. Then add DMARC
([Part 5](email-setup.md#part-5--dmarc)).

### 6.2 API keys

Create **three** keys, all with **Sending access** on the client's domain:

| Key name   | Goes to                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `website`  | Vercel env var `RESEND_API_KEY` (Part 8)                                                                               |
| `supabase` | Supabase custom SMTP (6.3)                                                                                             |
| `gmail`    | Gmail "Send mail as", optional ([email-setup.md, Part 3](email-setup.md#part-3--reply-from-gmail-as-info-and-podrska)) |

Separate keys mean one can be revoked without breaking the others.

### 6.3 Supabase sends through Resend

Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom SMTP**:

| Field        | Value                          |
| ------------ | ------------------------------ |
| Sender email | `obavijesti@<domain>`          |
| Sender name  | the brand `name`               |
| Host         | `smtp.resend.com`              |
| Port         | `465`                          |
| Username     | `resend` (literally that word) |
| Password     | the `supabase` key from 6.2    |

Then raise **Authentication → Rate Limits → emails per hour** to something sensible (e.g. 100); the
default assumes the built-in mailer.

✅ **Check:** Resend → **Domains** shows the domain as **Verified**.

---

## Part 7 — Google sign-in

### 7.1 Google Cloud

1. [console.cloud.google.com](https://console.cloud.google.com) → project picker → **New
   project**, named after the client.
2. **APIs & Services → OAuth consent screen** (also called **Google Auth Platform**) → **Get
   started**:
   - **App name:** the brand `name`. **User support email:** yours or the client's.
   - **Audience:** **External**.
   - **Contact email:** yours.
3. **Branding:** upload the logo (`public/icon-512.png` works), and fill in
   - Home page: `https://www.<domain>`
   - Privacy policy: `https://www.<domain>/politika-privatnosti`
   - Terms of service: `https://www.<domain>/uvjeti-koristenja`
   - Authorised domains: `<domain>` and `supabase.co`
4. **Audience → Publish app** (moves it out of "Testing", where only listed test users can sign in).
5. **Clients → Create client** → **Web application**:
   - **Authorised JavaScript origins:**
     - `https://www.<domain>`
     - `https://<domain>`
     - `http://localhost:3000`
     - `http://localhost`
   - **Authorised redirect URIs:** `https://<ref>.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client secret**.

The button uses Google's own popup, which names _your_ domain rather than Supabase's. The flip
side: it only appears on origins listed in step 5, so Vercel preview deployments show no Google
button. That's expected.

### 7.2 Supabase and env

1. Supabase → **Authentication → Sign In / Providers → Google** → enable → paste the **Client
   ID** (into "Client IDs") and the **Client secret** → Save.
2. `.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<the client id>`.

✅ **Check:** `npm run dev` → <http://localhost:3000/login> shows the Google button, and signing in
with it lands you on the dashboard.

---

## Part 8 — Vercel (hosting)

### 8.1 Create the project

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the client's GitHub
   repository. Framework: Next.js (detected). Don't deploy yet if it offers; add env vars first.

### 8.2 Environment variables

Project → **Settings → Environment Variables**. Tick the environments shown:

| Variable                                                                | Value                                 | Production | Preview  | Local (`.env.local`) |
| ----------------------------------------------------------------------- | ------------------------------------- | :--------: | :------: | :------------------: |
| `NEXT_PUBLIC_SUPABASE_URL`                                              | Part 4.2                              |     ✓      |    ✓     |          ✓           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                         | Part 4.2                              |     ✓      |    ✓     |          ✓           |
| `SUPABASE_SERVICE_ROLE_KEY`                                             | Part 4.2                              |     ✓      |    ✓     |          ✓           |
| `NEXT_PUBLIC_SITE_URL`                                                  | `https://www.<domain>`                |     ✓      |    —     |   — (leave empty)    |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`                                          | Part 7.1                              |     ✓      |    ✓     |          ✓           |
| `RESEND_API_KEY`                                                        | `website` key, Part 6.2               |     ✓      |    —     | — (keeps dev quiet)  |
| `EMAIL_FROM`                                                            | `<name> <obavijesti@<domain>>`        |     ✓      |    —     |          —           |
| `CONTACT_EMAIL_TO`                                                      | `info@<domain>`                       |     ✓      |    —     |          —           |
| `CRON_SECRET`                                                           | a long random string (command below)  |     ✓      |    —     |          —           |
| `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN` | Part 4.2                              |     —      |    —     |          ✓           |
| `NEXT_PUBLIC_FEATURE_*`                                                 | `false` to hide an unfinished feature |  optional  | optional |       optional       |

A random `CRON_SECRET`:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Why `NEXT_PUBLIC_SITE_URL` is Production-only: left unset, each preview deployment links to
itself and local development to `localhost:3000`. Never paste `http://localhost:3000` into Vercel.

Feature flags: a missing flag means **on**. To launch with, say, the blog hidden, add
`NEXT_PUBLIC_FEATURE_BLOG=false`; delete the variable to show it. The full list is in
`.env.example`.

**`NEXT_PUBLIC_*` values are baked in at build time**, so after changing any of them,
**redeploy** (Deployments → latest → ⋮ → Redeploy).

### 8.3 Domain

1. Project → **Settings → Domains** → add `www.<domain>`, then `<domain>`. Let Vercel redirect
   the bare domain to `www` (the app also does this itself, from `brand/config.ts`).
2. If DNS is in Vercel (Part 3), it configures the records itself. Otherwise add the records it
   shows at your DNS provider.

### 8.4 Deploy

Deploy (or redeploy) from the dashboard. The two daily jobs in `vercel.json` (Supabase keep-alive,
cleanup of old task attachments) register automatically on production deployments; they need
`CRON_SECRET`.

✅ **Check:** `https://<domain>` redirects to `https://www.<domain>` and the landing page loads with
the new brand. Vercel → project → **Settings → Cron Jobs** lists both jobs.

---

## Part 9 — First admin, then hand over

1. On the live site, **register** with the email that should be the first admin, and confirm it
   from the email (this also proves Part 6.3 works).
2. Locally:

   ```sh
   npm run make-admin -- that@email.ba
   ```

   (A plain SQL `update` in the Supabase editor is rejected by design; the script explains why.)

3. Sign in on the live site. You're in `/admin`. Now the in-app setup:

   | Where                     | Do                                                                                                                           |
   | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
   | `/admin/settings/payment` | the client's bank details. Students see these after requesting a course.                                                     |
   | `/admin/settings/legal`   | read both documents with the client. The placeholders show their filled-in values under the editor; change what doesn't fit. |
   | `/admin/blog`             | the starting posts are generic and reusable. Delete any the client doesn't want.                                             |
   | `/admin/categories`       | the client's course categories                                                                                               |
   | `/admin/users`            | promote the client's teachers / other admins once they've registered                                                         |

✅ **Check:** the footer of the live site shows the client's company details; `/kontakt` sends a
message that arrives in the Gmail inbox, and **Reply** goes to the visitor.

---

## Final checklist

- [ ] New GitHub repo; this code pushed to it
- [ ] `brand/config.ts` fully replaced (search it for the previous client's name, there should be none)
- [ ] `brand/logo.svg`, `brand/hero.jpg` replaced; `npm run brand` run; outputs committed
- [ ] Domain bought; nameservers on Vercel
- [ ] Supabase project created; migrations pushed (`npm run db:push`)
- [ ] Supabase Auth: Site URL, redirect URLs, Confirm email on, confirmation template + subject pasted
- [ ] ImprovMX: aliases → Gmail; test mail arrives
- [ ] Resend: domain verified, DMARC added, three keys created
- [ ] Supabase custom SMTP via Resend; email rate limit raised
- [ ] Google: consent screen published, web client with the four origins + the Supabase redirect URI, provider enabled in Supabase
- [ ] Vercel: env vars per the table, domain added, deployed, cron jobs listed
- [ ] First admin registered and promoted (`npm run make-admin`)
- [ ] Payment details, legal texts, categories set in the admin panel

## Troubleshooting

| Symptom                                                    | Likely cause                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run brand` says the logo needs a viewBox              | The SVG was exported without one. Re-export, or add `viewBox="0 0 <width> <height>"` to the root `<svg>`.                       |
| New logo/photo shows on some screens, old on others        | Browser cache. Hard-reload. (The photo and share image get new filenames on every change, so the server never serves old ones.) |
| Every page errors with "Missing environment variable"      | `.env.local` (or Vercel) lacks one of the three Supabase values.                                                                |
| `db:push` asks for a password or fails to connect          | `SUPABASE_DB_PASSWORD` wrong or missing, or the project isn't linked (`npm run supabase -- link --project-ref <ref>`).          |
| Sign-up never sends the confirmation email                 | Custom SMTP (6.3) not set or wrong key; or the domain isn't verified in Resend yet.                                             |
| Confirmation link leads to localhost or an error           | Supabase Site URL / redirect URLs (4.4), or `NEXT_PUBLIC_SITE_URL` missing in Vercel Production.                                |
| No Google button                                           | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` missing (redeploy after adding), or the current origin isn't an authorised JavaScript origin.    |
| Google popup: "Access blocked: app not verified / testing" | Consent screen still in Testing (7.1 step 4).                                                                                   |
| `make-admin` says no account                               | Register on the site first; use exactly the same email.                                                                         |
| Notification settings say email isn't active               | `RESEND_API_KEY` or `EMAIL_FROM` missing in Vercel Production, or no redeploy since.                                            |
| Cron jobs return 401                                       | `CRON_SECRET` not set in Vercel Production.                                                                                     |
