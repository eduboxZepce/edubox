# Pages to Build

This is the list of pages known to be needed, based on the full data model and backend already built. For each: its purpose, what data it needs, what states it must handle, and any business rules specific to it. Implementation details that are genuinely open (exact layout, modal vs. dedicated screen, component breakdown) are left to you — where something is explicitly undecided, it's flagged rather than silently prescribed. This list will likely be adjusted as work progresses; treat it as a starting checklist, not a locked spec.

Every page must handle, at minimum: **loading**, **empty** (no data yet), and **error** states. Pages under `(student)`/`(admin)` don't need auth checks — the route groups are already gated — but should still handle "no access to this specific resource" where relevant (e.g. viewing a course you haven't purchased).

---

## Public

### Landing / home (`(public)/`)

- Purpose: entry point, general marketing/orientation to the platform.
- Data: none required, or a small "featured courses" pull from `useCourses`.
- Open decision: exact content/sections — not specified yet.

### Course listing (`(public)/courses`)

- Purpose: browse all published courses.
- Data: `useCourses` — supports search, category filter, pagination (already built into the endpoint).
- Must contain: search input, category filter, course cards (thumbnail, name, price), pagination controls.
- States: no results for a given search/filter.

### Course detail — marketing view (`(public)/courses/[id]`)

- Purpose: convince a visitor to purchase; shown to anyone, logged in or not.
- Data: `useCourse(id)` — public course fields only (name, description, price, thumbnail, category). Module list may be shown as a locked/teaser preview, not full content.
- Must contain: course info, "Request Purchase" CTA.
- Business rule: if not logged in, CTA should route to login/register first, then back to this page. If already purchased, CTA should instead route into the course player.

---

## Student

### Dashboard (`(student)/dashboard`)

- Purpose: overview of the student's purchased courses and progress. This already has a bare version built as the auth sample page — this is the fuller version.
- Data: `useMyPurchases` + progress summary per course.
- Must contain: list of purchased/in-progress courses with a progress indicator each, link into each course player.
- States: no purchases yet (prompt to browse courses).

### Course player (`(student)/courses/[id]`)

- Purpose: the shell for going through a purchased course — module navigation + progress.
- Data: `useCourseModules(courseId)`, `useCourseProgress(courseId)`.
- Must contain: ordered module list with lock/unlock state, current progress indicator.
- Business rule: modules must be presented and gated in `order` sequence — a module is only enterable once the previous one's `module_progress.completed` is true. This is the core sequential-unlock rule from the schema; don't let the UI allow skipping ahead even if the student guesses a URL — the backend also enforces this, but the UI should reflect it clearly.

### Module view (`(student)/courses/[id]/modules/[moduleId]`)

- Purpose: consume a single module's content.
- Data: module details, `module_files`, `video_url`; whether it has a quiz and/or task (existence check, not a stored flag — see database file).
- Must contain: video player (if `video_url` present), file/materials list (downloadable), and links into the quiz/task sub-pages if they exist.
- Business rule: a module with neither quiz nor task auto-completes on view (per the schema's `completed` logic) — the UI should reflect this (e.g. mark it done once viewed) rather than leaving it looking perpetually incomplete.

### Quiz-taking screen (`(student)/courses/[id]/modules/[moduleId]/quiz`)

- Purpose: take the module's quiz.
- Data: `useQuiz(moduleId)` — note `is_correct` is already stripped server-side, so the UI cannot reveal answers before submission by design.
- Must contain: question list, single-select answer choice per question (radio buttons, matching the single-correct-answer rule), submit action.
- States: already passed before (show past result vs. allow retake — **open decision**: whether retakes are allowed at all isn't specified yet, confirm before building retake logic).
- Business rule: score and pass/fail determined server-side by the submit endpoint; UI just displays the result it's given, never calculates the score itself.

### Task view + submission thread (`(student)/courses/[id]/modules/[moduleId]/task`)

- Purpose: view the task prompt and manage the submission conversation with the admin.
- Data: task details + `task_files`; `useSubmission` + `useSubmissionMessages` for the thread.
- Must contain: task prompt/files, message thread (chronological), message composer with optional file attachment, current status indicator (`pending` / `needs_revision` / `approved`).
- Business rule: sending a message when no submission exists yet creates one; sending afterward adds to the existing thread — this should feel like one continuous conversation to the student, not two different flows.

### Purchase history / request status (`(student)/purchases`)

- Purpose: see all courses the student has requested, and their status.
- Data: `useMyPurchases`.
- Must contain: list with course name, price, status (`requested`/`denied`/`approved`).
- States: empty (no requests yet).

### Certificates (`(student)/certificates`)

- Purpose: view/download earned certificates, request physical delivery.
- Data: `useMyCertificates`.
- Must contain: list of certificates (course name, `readable_id`), a "request physical delivery" action per certificate (calls the existing endpoint).
- States: empty (none earned yet).

---

## Admin

### Course management (`(admin)/courses`, `(admin)/courses/[id]/edit`, `(admin)/courses/new`)

- Purpose: CRUD for courses.
- Data: `useAdminCourses` (list, includes unpublished), `useCreateCourse`, `useUpdateCourse`, `useDeleteCourse`.
- Must contain: list with search/filter (published/unpublished), create/edit form (name, description, price, thumbnail upload, category, published toggle).

### Module management (within a course — e.g. `(admin)/courses/[id]/modules`)

- Purpose: CRUD + reordering of modules within a course.
- Data: `useAdminModules(courseId)`, create/update/delete/reorder hooks.
- Must contain: ordered list (drag-to-reorder or up/down controls), create/edit form (title, description, video URL, file uploads), delete with confirmation.

### Quiz management (per module)

- Purpose: build/edit a module's quiz — questions and answers together.
- Data: nested create/update per the backend's nested-payload endpoint.
- Must contain: passing score field, question list editor, per-question answer list editor with single-correct-answer selection enforced in the UI (radio, not checkboxes, matching the backend constraint).
- Open decision: whether this is its own page or a section within the module edit screen — not specified, your call.

### Task management (per module)

- Purpose: create/edit a module's task.
- Data: create/update task + file uploads.
- Must contain: task text editor, file upload/list.
- Open decision: standalone page vs. section within module edit — same as quizzes, not specified.

### Purchase requests (`(admin)/purchases`)

- Purpose: review and approve/deny purchase requests.
- Data: `useAdminPurchases` (filterable by status), `useApprovePurchase`/`useDenyPurchase`.
- Must contain: filterable list (by status), approve/deny actions per row.
- Open decision: whether approve/deny happens inline in the list, via a row action, or a detail modal/page — not specified; this is an example of a case where a modal is probably the simplest fit, but not mandated.

### Submission review (`(admin)/submissions`)

- Purpose: review task submissions and respond, changing status as needed.
- Data: `useAdminSubmissions` (filterable by status/course/student), `useSubmissionMessages`, message + status-update actions.
- Must contain: filterable list of submissions, thread view per submission (same message thread as the student sees, plus the ability to change status when replying), file attachments visible.
- **Open decision — explicitly flagged, as discussed**: this could be a dedicated page (`(admin)/submissions/[id]`) or a modal launched from the list. Both are reasonable; pick based on how much screen space the thread view needs once you're building it.

### User management (`(admin)/users`)

- Purpose: visibility into registered users.
- Data: `useAdminUsers` (list/search).
- Must contain: list with name/email/role.
- Business rule: role changes happen manually via the Supabase dashboard, not this UI (per the original scope) — this page can be read-only, or you may decide later to expose role-switching here; not required now.

### Certificate delivery requests (`(admin)/certificates`)

- Purpose: see which students requested physical certificate delivery, mark them fulfilled.
- Data: `useAdminCertificates` (filterable by `requested_delivery`).
- Must contain: list, mark-as-fulfilled action.
- Open decision: "fulfilled" isn't currently a tracked field in the schema — if you want to track fulfillment status, that's a schema addition to raise, not something to fake client-side.
