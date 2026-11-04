# Online courses platform

A white-label online courses platform (Next.js + Supabase), set up here for one client.

- **Setting it up for a new client?** Follow
  [`docs/guides/new-client-setup.md`](docs/guides/new-client-setup.md). Everything client-specific
  is in the [`brand/`](brand/) folder (name, domain, colours, contact, logo, photo), in env vars
  (see [`.env.example`](.env.example)), and in the database (edited from the admin panel).
- **Working on the code?** Project documentation lives in [`docs/`](docs/README.md). Start with
  [`docs/project-context.md`](docs/project-context.md).

## Getting started

```bash
cp .env.example .env.local   # then fill it in, see the setup guide
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command                         | Does                                                     |
| ------------------------------- | -------------------------------------------------------- |
| `npm run brand`                 | Regenerate icons, share image, email logo… from `brand/` |
| `npm run check`                 | typecheck + lint + format check                          |
| `npm run db:push`               | Apply database migrations to the linked Supabase project |
| `npm run make-admin -- <email>` | Make an existing account an admin (the first one)        |

### Supabase keep-alive cron

A free-tier Supabase project is paused after 7 days without database activity.
`vercel.json` schedules a daily call (01:00 UTC) to `/api/keep-alive`, which runs
one tiny query. **Set `CRON_SECRET` in the Vercel project's environment variables
(Production)** — Vercel sends it as a bearer token, and the route rejects every
request with 401 while it is unset.
