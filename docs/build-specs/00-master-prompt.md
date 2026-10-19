# Master Build Prompt

This file ties together the four spec files into a single build instruction. Read this first.

---

## 1. Files and where to put them

Create a `docs/build-specs/` folder at the root of your new repo (before scaffolding, or right after — either works) and place all four files there:

```
docs/build-specs/
  01-project-setup.md
  02-database-and-migrations.md
  03-api-docs-setup.md
  04-auth-pages-setup.md
```

(Rename the files you downloaded to match this numbering — it's just to give the agent an unambiguous read order; the content doesn't change.)

Keep `.env.example` at the **repo root** (not inside `docs/`), since that's its standard location and where tooling expects to find it.

---

## 2. Build order

The files reference each other but are meant to be executed in this sequence, since each depends on scaffolding/state from the one before it:

1. **`01-project-setup.md`** — scaffold Next.js, install dependencies, theme, React Query, Zustand, Supabase clients, middleware skeleton.
2. **`02-database-and-migrations.md`** — Supabase project link, all migrations, RLS, storage buckets, then the backend API routes.
3. **`04-auth-pages-setup.md`** — login/register/callback/reset pages, route protection rules, one sample protected page. (Numbered after the DB file since it depends on `profiles`/the `handle_new_user` trigger existing.)
4. **`03-api-docs-setup.md`** — Zod schemas, OpenAPI registry, `/api-docs` page. (Last, since it wraps the endpoints built in step 2.)

If you want, renumber the files above to match this order (`01-project-setup`, `02-database-and-migrations`, `03-auth-pages-setup`, `04-api-docs-setup`) — the sequence matters more than the names.

---

## 3. Before you start

Fill in `.env.example`, rename it to `.env.local`, and have your Supabase project already created (project URL, anon key, service role key, project ref, DB password all in hand) — the agent will need these to link the CLI and run migrations against something real.

---

## 4. Which model to use

Use **Claude Code** with **Claude Opus 4.8** for this build. Reasoning:

- This is a multi-file, multi-step build with real interdependencies (schema → RLS → types → endpoints → auth → docs) spanning dozens of files — the kind of task where a stronger model materially reduces rework, versus a faster/cheaper model that might need more correction passes.
- Claude Code is the right _tool_ regardless of model — it can run the Supabase CLI, execute `npm install`, create the actual files, and iterate against real errors, rather than just producing code blocks for you to paste.
- If cost/speed matters more to you than getting it right on the first pass, Sonnet 5 is a reasonable fallback — just expect to review its migration/RLS output a bit more carefully, since that's the highest-stakes part of this build.

---

## 5. The prompt to give it

Paste this as your opening message to Claude Code, from the repo root, after the five files above are in place:

```
I'm building an online courses platform. Read, in order:
docs/build-specs/01-project-setup.md
docs/build-specs/02-database-and-migrations.md
docs/build-specs/03-auth-pages-setup.md
docs/build-specs/04-api-docs-setup.md

Then execute them in that order: scaffold the Next.js project per file 01,
set up the Supabase migrations/RLS/storage/endpoints per file 02, build the
auth pages and route protection per file 03, and set up the dynamic Swagger
docs per file 04.

.env.local is already populated with my Supabase credentials — use it to
link and push migrations. Ask me before running anything destructive
against the remote Supabase project. Do not build any page beyond what's
explicitly listed in file 03's sample protected page — all other UI pages
are out of scope and will be built manually afterward. Work through the
files sequentially and tell me if anything in them is ambiguous or
conflicts before you proceed on that part.
```

---

## 6. After it's done

You should be able to run the app, sign up, confirm email, log in, land on the one sample protected page, and browse `/api-docs` to see every endpoint's request/response shape — with the full schema, RLS, and backend logic already in place underneath. Everything past that (course pages, module pages, admin screens, etc.) is manual work, page by page, on top of this foundation.
