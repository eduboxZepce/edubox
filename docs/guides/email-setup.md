# Email setup — edubox-zepce.ba

Step-by-step instructions for the three addresses the site uses, **with no web hosting:
just the domain, plus two free services.** Do the parts in order; each one ends with a
check, so you know it worked before moving on.

---

## The plan in one picture

```
RECEIVING (ImprovMX)
  Someone writes to info@    ──► ImprovMX ──► your Gmail
  Someone writes to podrska@ ──► ImprovMX ──► your Gmail
  Someone writes to obavijesti@ (or anything else) ──► bounces

SENDING (Resend)
  You reply in Gmail ──► Gmail sends through Resend ──► arrives as from info@ / podrska@
  The website sends  ──► Resend ──► arrives as from obavijesti@
```

There are **no mailboxes anywhere.** Mail for your domain is passed straight to Gmail, and
Gmail is where you read, keep and answer it.

| Address                      | What it is                  | Receives mail?     | Can you send as it? |
| ---------------------------- | --------------------------- | ------------------ | ------------------- |
| `info@edubox-zepce.ba`       | ImprovMX alias → Gmail      | Yes                | Yes, from Gmail     |
| `podrska@edubox-zepce.ba`    | ImprovMX alias → Gmail      | Yes                | Yes, from Gmail     |
| `obavijesti@edubox-zepce.ba` | Nothing; only a sender name | No, replies bounce | Only the website    |

**Why two services:**

- **ImprovMX** _receives_ mail for your domain and forwards it. It can't send (not on the
  free plan).
- **Resend** _sends_ mail for your domain. The website already uses it, and Gmail can use
  it too. It can't receive.

**Is `obavijesti@` needed?** Yes, but only as the website's sender name. It's never created
anywhere. If the website sent as `info@` instead, every "thanks" reply to a notification
would land in your Gmail.

**What forwarding to `info@` would add:** nothing. You wanted `podrska@` → `info@` →
Gmail, but both aliases can point straight at Gmail. The result is the same, and Gmail
still sees which address the mail was sent to (that's what Part 3.3 relies on).

---

## Part 0 — DNS lives in Vercel

Everything below means adding **DNS records**, and for this domain they are added in
**Vercel**, not Globalhost. Globalhost is only the registrar: the domain's nameservers
point at Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), so any record typed into
Globalhost's DNS panel is ignored by the rest of the internet.

### Where to add a record

1. [vercel.com](https://vercel.com) → your team → **Domains** tab (top of the dashboard,
   not inside the project).
2. Click `edubox-zepce.ba` → **DNS Records**.
3. Fill in the form at the top and click **Add**:
   - **Name:** only the part _before_ the domain: `send`, `_dmarc`, `resend._domainkey`.
     For a record on the domain itself, **leave it empty** (Vercel doesn't use `@`).
   - **Type:** MX, TXT, …
   - **Value:** as given.
   - **Priority:** only for MX, in its own field. Don't type it into Value.
   - **TTL:** leave the default.

**Leave the records Vercel already shows alone.** The ones pointing the domain and `www`
at the website (ALIAS / A / CNAME) are what keeps the site online. Email only ever
_adds_ MX and TXT records next to them.

After adding a record, the list should show it as e.g. `send` (or
`send.edubox-zepce.ba`), **not** `send.edubox-zepce.ba.edubox-zepce.ba`. That doubled
name comes from typing the full name into the Name field, and it's the most common
mistake.

**Copy values from the service's own page**, not from this doc. The values here are to
show you what to expect; providers occasionally change them.

### Alternative: the Vercel CLI

If you prefer the terminal, every record can be added with `vercel dns add`, e.g.:

```sh
vercel dns add edubox-zepce.ba '' MX mx1.improvmx.com 10
vercel dns add edubox-zepce.ba _dmarc TXT 'v=DMARC1; p=none; rua=mailto:info@edubox-zepce.ba'
vercel dns ls edubox-zepce.ba
```

`''` is the empty name (the domain itself). The dashboard does exactly the same thing.

✅ **Check:** in Globalhost's domain settings, the nameservers are the two
`vercel-dns.com` ones. If they're something else, stop: the records belong wherever those
nameservers point, not in Vercel.

---

## Part 1 — Receiving: ImprovMX

### 1.1 Add the domain

1. Sign up at [improvmx.com](https://improvmx.com) (free plan).
2. Enter the domain `edubox-zepce.ba` and your Gmail address.
3. ImprovMX shows the DNS records it needs. **Leave that page open.**

### 1.2 Add the records

In Vercel → Domains → `edubox-zepce.ba` → DNS Records (Part 0):

| Type | Name    | Value                                  | Priority |
| ---- | ------- | -------------------------------------- | -------- |
| MX   | (empty) | `mx1.improvmx.com`                     | 10       |
| MX   | (empty) | `mx2.improvmx.com`                     | 20       |
| TXT  | (empty) | `v=spf1 include:spf.improvmx.com ~all` |          |

**Before adding, look at what's already there** (records with an empty name):

- **Other MX records:** there normally aren't any in Vercel. If there are (for example
  copied over when the domain moved from Globalhost), **delete them**. Mail goes to
  whichever MX it likes, so a leftover one sends some of your mail into nowhere.
- **An existing TXT starting with `v=spf1`:** delete it and add the one above instead.
  Two SPF records on the same name break both.

Back in ImprovMX, click **Check again** until both MX and SPF show green. It can take from a
few minutes to a few hours.

### 1.3 Create the aliases

ImprovMX dashboard → your domain → **Aliases**:

1. **Delete the catch-all.** ImprovMX usually creates an alias `*` → your Gmail at setup.
   Remove it. Without a catch-all, mail to any address you didn't create (including
   `obavijesti@`) bounces, and that's what makes `obavijesti@` unanswerable. With it,
   notification replies and spam to made-up addresses would all land in your Gmail.
2. **Add alias** `info` → `yourname@gmail.com`.
3. **Add alias** `podrska` → `yourname@gmail.com`.

✅ **Check. Use a _different_ account, not your Gmail.** Gmail hides a message it sent
itself when it comes back through forwarding, so a test from your own Gmail looks broken
when it isn't.

1. From another account, write to `info@edubox-zepce.ba` → arrives in Gmail.
2. From another account, write to `podrska@edubox-zepce.ba` → arrives in Gmail, and the
   "to" line says `podrska@`.
3. From another account, write to `nepostoji@edubox-zepce.ba` → the sender gets a bounce.

If forwarded mail lands in Gmail's **Spam**: open it, click **Not spam**, then make a
filter (Gmail search bar → ⚙ options → _To:_ `info@edubox-zepce.ba OR podrska@edubox-zepce.ba`
→ **Create filter** → tick **Never send it to Spam**).

---

## Part 2 — Sending: verify the domain in Resend

The website and Gmail both send through Resend, and Resend only sends for a domain you've
proven you own.

### 2.1 Add the domain

1. Sign up at [resend.com](https://resend.com).
2. **Domains → Add Domain** → `edubox-zepce.ba`.
3. **Region:** **EU (Ireland)**.
4. Resend shows about three records. **Leave that page open.**

### 2.2 Add the records

Roughly (copy the real ones from Resend):

| Type | Name                | Value (example)                         | Priority |
| ---- | ------------------- | --------------------------------------- | -------- |
| TXT  | `resend._domainkey` | `p=MIGfMA0GCSq…` (long key)             |          |
| MX   | `send`              | `feedback-smtp.eu-west-1.amazonses.com` | 10       |
| TXT  | `send`              | `v=spf1 include:amazonses.com ~all`     |          |

These sit on `send` and `resend._domainkey`, **not** on the domain itself, so they don't interfere with
ImprovMX's records from Part 1. In particular the `send` MX only handles bounces for
Resend; it doesn't receive your mail.

### 2.3 Verify

Resend → **Verify DNS Records**. Wait until the domain shows **Verified**.

### 2.4 Create two API keys

Resend → **API Keys → Create API Key**, twice. Both with **Sending access**, domain
`edubox-zepce.ba`:

| Name      | Used by                       |
| --------- | ----------------------------- |
| `website` | Vercel (Part 4)               |
| `gmail`   | Gmail's Send mail as (Part 3) |

Copy each one straight away into a password manager; Resend shows a key only once.

**Why two keys:** if you ever need to revoke one (say the Gmail one leaks), the website
keeps working, and vice versa.

---

## Part 3 — Reply from Gmail as `info@` and `podrska@`

### 3.1 Add `info@`

1. Gmail **on a computer** → ⚙ → **See all settings** → **Accounts and Import**.
2. **Send mail as** → **Add another email address**.
3. In the popup:
   - **Name:** `Edubox Žepče`
   - **Email address:** `info@edubox-zepce.ba`
   - **Treat as an alias:** leave ticked
   - **Next Step**
4. SMTP screen:
   - **SMTP Server:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend` (literally that word, not your email)
   - **Password:** the `gmail` API key from 2.4
   - **Secured connection using SSL**
   - **Add Account**
5. Gmail emails a confirmation to `info@`. ImprovMX forwards it to your Gmail. Click the
   link or paste the code.

### 3.2 Add `podrska@`

Repeat 3.1 with **Email address** `podrska@edubox-zepce.ba` and the same SMTP settings
and the same key. You can use any name, e.g. `Edubox Žepče — podrška`.

(No mailbox is needed: Resend lets you send as any address on a verified domain.)

### 3.3 Choose how the "From" address is picked

Still in **Accounts and Import → Send mail as**, find **"When replying to a message"**:

| Setting                                                    | What happens                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Reply from the same address the message was sent to** ✅ | Sent to `info@` → you reply as `info@`. Sent to `podrska@` → you reply as `podrska@`. Sent to your Gmail → you reply as your Gmail. |
| Always reply from default address                          | Every reply uses the address marked **default**, regardless of where the message arrived.                                           |

**Pick the first one.** That's "based on where it came from".

**Make default** (on the same page) only decides what a _new_ email (not a reply) starts
with. Leave your personal Gmail as default if this Gmail is mostly personal.

**You can always change it by hand:** in any compose or reply window, click the **From**
line and pick another address. The Gmail phone app has the same dropdown, and the reply
rule above applies there too.

✅ **Check (again from another account):**

1. Write to `podrska@` → in Gmail, **Reply** → the From line shows `podrska@edubox-zepce.ba`
   → send.
2. On the other account it shows as from `podrska@edubox-zepce.ba`, with no mention of
   Gmail.
3. On the other account (if it's Gmail): open the reply → **⋮ → Show original** →
   `SPF: PASS`, `DKIM: PASS`.

---

## Part 4 — The website (`obavijesti@`)

Vercel → project → **Settings → Environment Variables**, environment **Production**:

| Name               | Value                                       |
| ------------------ | ------------------------------------------- |
| `RESEND_API_KEY`   | the `website` key from 2.4                  |
| `EMAIL_FROM`       | `Edubox Žepče <obavijesti@edubox-zepce.ba>` |
| `CONTACT_EMAIL_TO` | `info@edubox-zepce.ba`                      |

Then **redeploy** (Deployments → latest → ⋮ → Redeploy). Env changes only apply to new
deployments.

**Don't** put the key in `.env.local`. Without it, local development logs emails instead of
sending them, which is what stops you from accidentally emailing the seeded test students.

**How the website handles replies:**

- **Notifications and the newsletter:** no reply-to. The footer says _"Na ovu poruku nije
  moguće odgovoriti — pišite nam na info@edubox-zepce.ba."_ Anyone who replies anyway gets
  a bounce (no catch-all, Part 1.3).
- **Contact form:** goes from `obavijesti@` to `info@` → ImprovMX → your Gmail, with the
  visitor set as reply-to. Clicking **Reply** answers the visitor directly, and since the
  message was sent _to_ `info@`, Gmail picks `info@` as your From address.

✅ **Check:** on the live site, send a message through `/kontakt` → it arrives in Gmail →
**Reply** is addressed to the email typed into the form, from `info@`.

---

## Part 5 — DMARC

One more record in Vercel → Domains → `edubox-zepce.ba` → DNS Records:

| Type | Name     | Value                                               |
| ---- | -------- | --------------------------------------------------- |
| TXT  | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@edubox-zepce.ba` |

Gmail and Yahoo expect a domain that sends mail to have one. `p=none` means "just report,
don't block". Big providers will send a small daily report to `info@` (so, to your Gmail).
After a few weeks with no surprises, change `p=none` to `p=quarantine`.

If the reports are annoying: Gmail filter on `subject:(Report domain: edubox-zepce.ba)` →
**Skip the Inbox**.

✅ **Check:** repeat the Part 3 test → **Show original** → `SPF: PASS`, `DKIM: PASS`,
`DMARC: PASS`.

---

## Limits to know about

- **Resend's free tier: roughly 100 emails a day, 3,000 a month, shared between your
  Gmail replies and the website.** If it runs out, both stop sending until the next day,
  and Gmail shows you a bounce for your reply. That's plenty at this size. Resend's paid
  plan removes the problem when it stops being enough.
- **Resend's dashboard shows every email sent through it**, including your Gmail replies,
  for a short while (Emails tab). Anyone with access to the Resend account can read them.
- **ImprovMX's free tier** forwards for one domain with a modest number of aliases and an
  attachment size limit. Check the current numbers on their pricing page.

Limits change; check both pricing pages when you sign up.

---

## Final checklist

- [ ] Nameservers at Globalhost are Vercel's; records go in Vercel → Domains (Part 0)
- [ ] ImprovMX: MX ×2 + SPF added, old MX removed, only one `v=spf1` on the domain, status green
- [ ] ImprovMX: catch-all `*` deleted; `info` and `podrska` → Gmail
- [ ] Test mail to `info@` and `podrska@` from another account arrives in Gmail
- [ ] Test mail to a made-up address bounces
- [ ] Resend: domain **Verified**, two API keys created and saved
- [ ] Gmail: `info@` and `podrska@` added under Send mail as, both confirmed
- [ ] Gmail: "Reply from the same address the message was sent to"
- [ ] `_dmarc` record added
- [ ] Vercel: `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL_TO` set, redeployed
- [ ] Contact form on the live site → Gmail → Reply goes to the visitor, from `info@`

## Troubleshooting

| Symptom                                               | Likely cause                                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Your own test from Gmail to `info@` never shows up    | Normal: Gmail hides its own mail coming back. Test from another account.                                                                |
| Some mail arrives, some doesn't                       | A leftover MX record (empty name) in Vercel besides ImprovMX's two. Delete it.                                                          |
| ImprovMX or Resend never turns green / Verified       | Name typed with the domain doubled (`send.edubox-zepce.ba.edubox-zepce.ba`), or records added at Globalhost instead of Vercel (Part 0). |
| Mail to a made-up address arrives instead of bouncing | The ImprovMX catch-all `*` alias still exists.                                                                                          |
| Forwarded mail lands in Gmail spam                    | Mark **Not spam** and add the "Never send it to Spam" filter (Part 1.3).                                                                |
| Gmail Send mail as says authentication failed         | Username must be the word `resend`; password is the API key, not your Resend login password.                                            |
| Gmail replies suddenly bounce                         | Resend's daily limit reached, or the `gmail` key was revoked.                                                                           |
| Site's notification settings say email isn't active   | `RESEND_API_KEY` or `EMAIL_FROM` missing in Vercel, or no redeploy after adding them.                                                   |
