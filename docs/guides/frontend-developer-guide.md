# Frontend Developer Guide

Welcome. This is your orientation to the codebase — how it's organized, how the pieces fit together, and how to build a page here. It's not a full tutorial for any individual technology; where you need to go deeper, links are provided. Read this once before touching anything, then keep it open as a reference.

---

## 1. The stack, briefly

- **Next.js (App Router)** — the framework. Pages live as files under `src/app/`; the folder structure _is_ the routing.
- **TypeScript** — everything is typed, including the database itself (see section 8).
- **Material UI (MUI)** — the component library. Buttons, forms, layout, everything visual starts from MUI components, styled via the shared theme.
- **TanStack React Query** — handles all data fetching/caching. You never call `fetch` or the Supabase client directly from a page — you call a hook.
- **Zustand** — small, global client-side state (right now: the logged-in user's session/role). Not for server data — that's React Query's job.
- **Supabase** — the database and auth provider. You mostly won't touch it directly; it's already wired up behind the hooks and the auth pages.

---

## 2. Project structure

```
src/
  app/            <- routes. Each folder = a URL segment. page.tsx = the page itself.
    (public)/      <- pages anyone can see (landing, course listing...)
    (student)/      <- pages only logged-in students can see
    (admin)/admin/  <- pages only the admin can see, served at /admin/...
    api/            <- backend route handlers — you won't build these, they already exist
  components/      <- reusable UI pieces shared across pages
    admin/           <- the admin shell: sidebar, top bar, nav config
    courses/         <- course-specific pieces (CourseForm, CourseCard, CourseTable...)
    data/            <- list-page pieces (SearchField, PaginationBar, StatCard...)
    feedback/        <- loading / error / empty / confirm / toast
    form/            <- the form kit (Form, FormTextField, FormSelect...)
    layout/          <- page skeleton (PageContainer, PageHeader, ContentCard)
  hooks/            <- React Query hooks — one file per resource (useCourses.ts, useModules.ts...)
  lib/
    supabase/        <- Supabase client setup — don't modify
    query/            <- React Query client config — don't modify
    api/client.ts     <- the fetch wrapper the hooks use — don't modify
    forms/            <- useZodForm + file validation schemas
    schemas/          <- zod schemas: the single source of truth for API types
    format.ts         <- price/date formatting. Never format these inline.
    status.ts         <- status enum -> Serbian label + colour
    storage.ts        <- bucket names, object-path rules, public URLs
  store/            <- Zustand stores (useAuthStore.ts, useToastStore.ts)
  theme/            <- theme.ts — MUI theme definition
  types/            <- generated database types (database.types.ts)
  proxy.ts          <- route protection — don't modify without asking
```

The three route groups — `(public)`, `(student)`, `(admin)` — are already gated. If you create a page inside `(student)/`, it's automatically protected; you don't need to add any auth check yourself.

Two things to know about the naming:

- **`proxy.ts`, not `middleware.ts`.** Next.js 16 renamed the convention; the behaviour is the same. It gates on URL prefixes (`/dashboard`, `/admin`) because route groups like `(admin)` don't appear in the URL at all.
- **That's why admin pages live at `(admin)/admin/…`.** The group applies the layout and the role check; the `admin` folder supplies the `/admin` URL the proxy actually gates on. A page placed directly in `(admin)/` would be served at the root and would _not_ be protected.

---

## 3. Where logic lives vs. where UI lives

This is the most important convention to internalize:

- **Data fetching and mutations** → always through a hook in `src/hooks/`. Never call Supabase or `fetch` directly inside a component.
- **Global session/role state** → `useAuthStore` (Zustand), for things like "is this user an admin."
- **Everything else (page state, form input, a toggle)** → normal React `useState` inside the component. Not every piece of state needs to be global.
- **Components** → stay presentational. A component should describe what things look like, not how to fetch or save them — that's the hook's job.

### Example: using an existing hook

```tsx
// inside a page or component
import { useCourses } from '@/hooks/useCourses';

function CourseList() {
  const { data, isLoading, error } = useCourses({ page: 1 });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Couldn't load courses.</Alert>;

  // List hooks return the API envelope: `data.data` is the rows,
  // `data.meta` is { page, pageSize, total, totalPages } for pagination.
  return data.data.map((course) => <CourseCard key={course.id} course={course} />);
}
```

Two conventions worth knowing before you use these:

- **List hooks return `{ data, meta }`; detail hooks return the record directly.** Lists need `meta` to render pagination, so the envelope is preserved. A detail hook like `useCourse(id)` unwraps it for you.
- **Mutations are `useMutation`** — call `.mutate(...)` or `await .mutateAsync(...)`, and the hook invalidates the caches the change affects. You don't refetch by hand.

Errors are `ApiRequestError` with a numeric `status`. That distinction matters: on a course page a 403 from `useCourseModules` means "hasn't bought this course" (show a purchase prompt), not "something broke".

```tsx
import { isApiRequestError } from '@/lib/api/client';

if (isApiRequestError(error) && error.status === 403) return <PurchasePrompt />;
```

If the hook you need doesn't exist yet, check with whoever's maintaining the backend layer before writing your own data-fetching logic — the endpoint likely already exists and just needs a hook wrapped around it.

---

## 4. How to build a new page

1. Find (or create) the right folder under the correct route group — `(public)`, `(student)`, or `(admin)` — matching who should see it.
2. Create `page.tsx` inside it. That's the page.
3. **Copy the closest existing page rather than starting blank.** Three are written to be read as templates:
   - a list page — `src/app/(admin)/admin/courses/page.tsx`
   - a form page — `src/app/(admin)/admin/courses/new/page.tsx`
   - a dashboard — `src/app/(admin)/admin/page.tsx`
4. Pull data via an existing hook (section 3). Build the UI from the shared kit (section 6) and MUI components (section 5).
5. Handle the real states: loading, empty, error, and — where relevant — "not allowed" (e.g. a student viewing a course they haven't purchased). `<QueryState>` covers the first three.
6. If the page needs a new hook or the backend doesn't return something you need, flag it rather than reaching around the data layer yourself.

A page that fetches data with hooks needs `'use client'` at the top. A page that only reads the session server-side doesn't — compare the two course pages against `(student)/dashboard/page.tsx`.

---

## 5. Using Material UI here

- The shared theme lives in `src/theme/theme.ts` — colors, typography, spacing all come from there. Don't hardcode a color or font size in a component if the theme already defines one.
- Prefer MUI components over raw HTML elements (`<Button>` not `<button>`, `<Typography>` not `<p>`) — this keeps styling consistent automatically.
- For one-off styling, use the `sx` prop rather than a separate CSS file:
  ```tsx
  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>...</Box>
  ```
- Numbers in `sx` spacing (`gap: 2`, `mt: 3`) are theme spacing units, not pixels — that's intentional, it keeps spacing consistent across the app.
- If you find yourself repeating the same styled combination of MUI components in multiple places, that's a sign it should become a shared component in `src/components/`, not copy-pasted.
- MUI docs: https://mui.com/material-ui/getting-started/

---

## 6. The shared component kit

Before you build anything, check whether one of these already does it. They exist so every page looks and behaves the same without anyone having to remember how.

**Page skeleton** (`src/components/layout/`)

| Component         | What it's for                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `PageContainer`   | Outermost wrapper. Owns max width and the spacing between top-level blocks. `maxWidth="form"` narrows the column for form pages. |
| `PageHeader`      | Breadcrumbs, `<h1>`, description, and a slot for page actions.                                                                   |
| `ContentCard`     | A bordered panel with an optional title. The default container for a block of content. `disablePadding` for tables.              |
| `PlaceholderPage` | Stand-in for a route that's routed but not yet built.                                                                            |

**States** (`src/components/feedback/`)

| Component        | What it's for                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `QueryState`     | Renders loading / error / empty / loaded for a React Query read. Start here — it replaces the whole `if (isLoading)…` ladder. |
| `LoadingState`   | Spinner for a region whose content hasn't arrived.                                                                            |
| `LoadingOverlay` | Covers content while a _write_ is in flight, keeping it visible. `<Form>` renders this for you.                               |
| `ErrorState`     | Failure alert with a retry button. Takes the raw error.                                                                       |
| `EmptyState`     | "Nothing here" with an optional call to action.                                                                               |
| `ConfirmDialog`  | Confirmation prompt for destructive actions.                                                                                  |

**Data display** (`src/components/data/`) — `SearchField`, `PaginationBar`, `ViewModeToggle`, `StatCard`, `StatusChip`.

The typical list page is three of these plus a hook:

```tsx
const list = useListParams({ published: '' });     // page + search + filters
const courses = useAdminCourses(list.queryParams);

<QueryState query={courses} isEmpty={(p) => p.data.length === 0} empty={<EmptyState … />}>
  {(page) => (
    <>
      <CourseTable courses={page.data} />
      <PaginationBar meta={page.meta} onChange={list.setPage} />
    </>
  )}
</QueryState>
```

`useListParams` exists to enforce one rule that's easy to miss: **changing a search or filter resets you to page 1.** It also debounces the search term so typing stays instant while the request doesn't fire per keystroke.

**Toasts.** `toast.success('…')` / `toast.error('…')` from `@/store/useToastStore`, callable from anywhere — no hook, no provider. `<ToastHost>` is already mounted in the root layout.

**Error wording.** Never show a raw error. `errorMessage(error)` from `@/lib/api/errorMessage` turns any thrown value into a sentence in Serbian. `ErrorState` and `Form` already call it.

---

## 7. Building a form

`src/app/(admin)/admin/courses/new/page.tsx` is the reference implementation — read it before writing your first form. The short version:

**1. Write a form schema** in `src/lib/schemas/*-form.schema.ts`, using plain `zod` (not `@/lib/openapi/zod`, which drags OpenAPI tooling into the browser bundle). It's separate from the API schema for two reasons: a form has fields the API doesn't (a `File` where the API stores a path), and validation messages are read by a person, in their language.

Keep the two in sync with a mapper function annotated to return the API type — if the endpoint's contract changes, that function stops compiling:

```ts
export function toCreateCoursePayload(values: CourseFormValues): CreateCourseRequest { … }
```

**2. Build the form** with `useZodForm` + `<Form>` + the `Form*` fields. The fields find the form through context, so they only need a `name`:

```tsx
const form = useZodForm(courseFormSchema, { defaultValues: emptyCourseFormValues });

<Form form={form} onSubmit={handleSubmit} pendingLabel="Čuvanje…">
  <FormTextField name="name" label="Naziv kursa" required />
  <FormNumberField name="price" label="Cena" suffix="RSD" min={0} />
  <FormSelect name="category_id" label="Kategorija" options={categories.options} />
  <FormSwitch name="published" label="Objavi kurs" />
  <FormActions submitLabel="Sačuvaj" cancelHref="/admin/courses" />
</Form>;
```

Available fields: `FormTextField`, `FormNumberField`, `FormSelect`, `FormSwitch`, `FormImageUpload`, plus `FormActions` for the button row.

Use `FormNumberField`, never `<FormTextField type="number">` — a number input reports a **string**, which a `z.number()` field would reject.

**3. Write the submit handler as if nothing can fail.** `<Form>` catches whatever it throws, shows it inline _and_ as a toast, and runs the loading overlay while it's in flight. So don't wrap it in try/catch:

```tsx
async function handleSubmit(values: CourseFormValues) {
  const { data: course } = await createCourse.mutateAsync(toCreateCoursePayload(values));
  toast.success(`Kurs „${course.name}” je kreiran.`);
  router.push('/admin/courses');
}
```

The exception is a **partial** failure. In the course form the thumbnail is uploaded _after_ the course exists (its storage path is `{course_id}/…`, so the id has to exist first). If that upload fails the course was still created — rethrowing would say "saving failed" and invite a retry that creates a duplicate. So that one step catches, warns, and carries on. Whenever a submit has multiple steps, ask which failures mean "nothing happened" and which mean "most of it happened".

**Reuse the form across create and edit.** `CourseForm` owns the fields; each page owns its own `onSubmit`. Note that `defaultValues` is read once at mount, so an edit page must render the form _inside_ its `<QueryState>`, not beside it, or the fields mount empty.

**File uploads** go through `useUploadFile()` → `POST /api/admin/uploads`, which works for every bucket. Build paths with `storagePath()` from `@/lib/storage`: the storage RLS policies parse the id folders back out of the path, so a wrong shape uploads fine and is then unreadable.

---

## 8. Types and the database

- `src/types/database.types.ts` is auto-generated from the actual Supabase schema — never edit it by hand. If the schema changes, someone regenerates this file.
- The types a hook gives you come from `src/lib/schemas/*.schema.ts` — the zod schemas that also validate requests on the server and generate `/api-docs`. One definition, three uses. If you need to name an API type in your own code (a component prop, say), import it from there: `import type { Course } from '@/lib/schemas/courses.schema'`.
- Use `import type` for these, not a plain `import`. Type-only imports vanish at build time; a plain one would pull zod into the browser bundle.
- Never redeclare an API shape as a local `interface`. If a type you need isn't exported from the schema file yet, add the `z.infer` export there rather than writing the shape out by hand.
- This means table shapes are already typed for you — when you use a hook, the data it returns is typed automatically. Let TypeScript guide you: if something doesn't have the field you expect, check the actual schema/types file rather than assuming.

---

## 9. Auth, in plain terms

- Login, register, email confirmation, password reset, and logout are already built (`(public)/login`, `(public)/register`, `/auth/callback`, `(public)/forgot-password`, `(public)/reset-password`).
- `useAuthStore` tells you who's logged in and their role (`admin` or `student`) — use it for role-based UI (e.g. showing an admin-only button).
- You will never need to touch the Supabase clients, RLS policies, or migrations. If a page seems to need different data access than what's available, that's a backend question, not something to solve by loosening security client-side.

---

## 10. Naming conventions

- **Files/folders**: `kebab-case` for route folders (`course-detail/`), `PascalCase` for component files (`CourseCard.tsx`), `camelCase` for hooks (`useCourses.ts`) and utility files.
- **Components**: `PascalCase`, named for what they render (`ModuleProgressBar`, not `Progress2`).
- **Hooks**: prefixed `use`, named for the resource + action where relevant (`useCourses`, `useCreateCourse`, `useApprovePurchase`).
- Keep names descriptive over short — `ModuleVideoPlayer` beats `MVP` or `Player`.

---

## 11. Git basics

- **Clone** the repo, then always **pull** the latest before starting new work: `git pull origin main`.
- **Branch per task**, off `main`:
  ```bash
  git checkout -b feature/course-detail-page
  # or: fix/quiz-score-bug
  ```
- **Commit often, in small chunks**, with a clear message describing _what_ changed:
  ```bash
  git add .
  git commit -m "Add course detail page layout"
  ```
- **Push your branch** and open a **pull request** rather than pushing straight to `main`:
  ```bash
  git push origin feature/course-detail-page
  ```
- Never commit `.env.local` (it's already git-ignored — don't remove that).
- If you're unsure whether a change is "done enough" to commit, smaller and more frequent is safer than one giant commit at the end of the day.
- Git basics reference: https://git-scm.com/book/en/v2/Getting-Started-Git-Basics

---

## 12. Further resources

- Next.js App Router: https://nextjs.org/docs/app
- Material UI: https://mui.com/material-ui/getting-started/
- TanStack React Query: https://tanstack.com/query/latest/docs/framework/react/overview
- Zustand: https://zustand.docs.pmnd.rs/
- Supabase JS client: https://supabase.com/docs/reference/javascript/introduction
- The live API reference for every backend endpoint: `/api-docs` in the running app

When in doubt: find the closest existing example in the codebase and follow its pattern before inventing a new one.
