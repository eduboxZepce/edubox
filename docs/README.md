# Documentation

Every Markdown document about this project lives under `docs/`. The only exceptions are
the files tools look for at the repo root: `README.md`, `CLAUDE.md` and `AGENTS.md`
(the last is rewritten by `next dev`).

| Path                                                                       | What it is                                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [`project-context.md`](project-context.md)                                 | Decisions, conventions and traps. **Read before writing code**; append when a decision is made                           |
| **`guides/`**                                                              | How-tos for people working on or running the project                                                                     |
| [`guides/frontend-developer-guide.md`](guides/frontend-developer-guide.md) | Orientation to the codebase and how to build a page here                                                                 |
| [`guides/email-setup.md`](guides/email-setup.md)                           | Step-by-step setup of the site's email addresses (ImprovMX + Resend + Gmail)                                             |
| **`content/`**                                                             | Copy and configuration the client has to review or supply                                                                |
| [`content/client-content.md`](content/client-content.md)                   | Pre-launch checklist of client-owned text and settings                                                                   |
| [`content/public-pages-review.md`](content/public-pages-review.md)         | Copy and link review of the public pages                                                                                 |
| **`build-specs/`**                                                         | The original specs the project was generated from — historical, superseded where they disagree with `project-context.md` |
| [`build-specs/00-master-prompt.md`](build-specs/00-master-prompt.md)       | How the four specs were fed to the build                                                                                 |
| `build-specs/01-…04-*.md`                                                  | Project setup, database, API docs, auth pages                                                                            |
| [`build-specs/05-pages-to-build.md`](build-specs/05-pages-to-build.md)     | The original frontend page checklist                                                                                     |
