# Public pages — copy and link review

Reviewed 2026-10-16. Analysis only; nothing has been changed yet.

**Scope:** static text in the code on the public pages (landing, header, footer, `/courses`,
`/courses/[slug]`, `/blog`, `/kontakt`, `/provjera-certifikata`, the legal pages, and the
auth pages). Database content (courses, categories, payment settings, legal texts) is test
data and is left out, apart from one note at the end.

**Method:** read the source, then crawled every page linked from the header, footer,
sitemap and blog on a local dev server.

Each item gives the location, what's wrong, and a suggested fix.

---

## 1. Dead or placeholder links

No internal link returns 404. Every page linked from the header, footer, sitemap and blog
returns 200. The footer's "O nama" link is already gone (removed in `PublicFooter.tsx` with
a comment, because the page never existed).

What's still wrong:

| #   | Where                                                                    | Problem                                                                                                                                                                  | Suggested fix                                                                         |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1.1 | Footer → Kontakt column (`SITE.social` in `src/lib/siteConfig.ts`)       | Instagram, LinkedIn and Facebook point at the networks' **home pages** (`https://instagram.com` etc.), not at Edubox profiles. They also feed the Organization JSON-LD.  | Put in the real profile URLs, or set `href: ''` to hide any that don't exist.         |
| 1.2 | Footer, `/kontakt` (`SITE.contact.phone`)                                | `+387 33 000 000` is a placeholder. 033 is the **Sarajevo** area code; Žepče is **032**.                                                                                 | Real number.                                                                          |
| 1.3 | Footer, `/kontakt`, email footer (`SITE.contact.email` / `supportEmail`) | `info@` / `podrska@edubox-zepce.ba` are marked PLACEHOLDER. The privacy policy uses `edubox.zepce@gmail.com` instead, so the site shows two different contact addresses. | Choose one set of addresses and use it everywhere, including the privacy policy text. |
| 1.4 | `/kontakt` → "Uslovi korištenja i plaćanje"; auth pages' legal links     | Links to `/uvjeti-koristenja`, which currently shows "Ovaj dokument još nije objavljen". The link text also promises payment terms.                                      | Publish the terms, or hide the link until they exist. See also 3.3.                   |
| 1.5 | Footer → company line (`SITE.company`)                                   | All three fields are empty, so the footer has no legal entity. The privacy policy names one (Razvojna agencija Žepče, ID 4218693330009).                                 | Fill in `SITE.company` to match.                                                      |

---

## 2. Claims the product doesn't support

These are the most important items: visitors read them as promises.

| #    | Where                                                                          | Text                                                                                                                          | What actually happens                                                                                                                                     | Suggested fix                                                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1  | `Faq.tsx`, "Kako se plaća?"                                                    | "Kartično plaćanje ili uplatnica, po kursu. Za firme i grupne upise izdajemo fakturu — **placeholder, uvjeti se dopunjuju.**" | There is no card payment, only a bank transfer that an admin confirms. The word "placeholder" is **shown to visitors**.                                   | e.g. "Uplatom na račun, po kursu. Nakon zahtjeva za pristup dobijaš poziv na broj i podatke za uplatu; kurs se otključava kada uplata stigne." Drop the invoice sentence unless that's really offered. |
| 2.2  | `Faq.tsx`, "Šta je potrebno da dobijem certifikat?"                            | "…prihvaćeni svi praktični zadaci i **položen završni ispit**."                                                               | There is no final exam. A certificate is issued when every module is complete (its quiz passed, its task approved, or a content-only module marked done). | "Završiti sve module kursa — riješiti kvizove i dobiti prihvaćene zadatke. Certifikat se izdaje automatski."                                                                                           |
| 2.3  | `HowItWorks.tsx`, step 04                                                      | "Kada su svi zadaci ocijenjeni i **završni ispit položen**, certifikat je odmah dostupan za preuzimanje i **dijeljenje**."    | No final exam (as 2.2). The certificate page is private; what can be shared is the verification link.                                                     | "Kada završiš sve module, certifikat je odmah dostupan za preuzimanje, s brojem koji poslodavac može provjeriti."                                                                                      |
| 2.4  | `WhyUs.tsx`, "Kako se provjerava znanje"                                       | "Kratki kvizovi **nakon lekcija**, praktični zadaci po modulima i **završni ispit koji se ocjenjuje ručno**."                 | A module has at most one quiz, which is scored automatically. No final exam.                                                                              | "Kviz i praktični zadatak u modulima; zadatke pregleda i komentariše predavač."                                                                                                                        |
| 2.5  | `WhyUs.tsx`, "Akreditacije i partneri"                                         | "Programi su rađeni s partnerskim firmama i institucijama iz svake oblasti."                                                  | Nothing supports this, and it's the riskiest claim on the page.                                                                                           | Remove, or replace with something true (e.g. "Učenje u svom tempu" or "Trajan pristup").                                                                                                               |
| 2.6  | `Faq.tsx`, "Ko pregleda moje zadatke?"                                         | "Predavač kursa **ili njegov asistent**."                                                                                     | There is no assistant role. Reviewers are admins or the owning teacher. "njegov" also assumes a male teacher.                                             | "Predavač kursa. Povratnu informaciju u pravilu dobijaš u roku od 48 sati…"                                                                                                                            |
| 2.7  | `HowItWorks.tsx`, step 01                                                      | "Otvoriš račun… i **dobijaš pristup** pregledu svih objavljenih kurseva, programa i **uvodnih lekcija**."                     | The catalogue is public, so no account is needed to browse it. There are no intro lessons: a non-buyer sees only locked module titles.                    | "Otvoriš račun u minuti — potreban je samo da pošalješ zahtjev za kurs."                                                                                                                               |
| 2.8  | `HowItWorks.tsx`, step 02                                                      | "**Upisuješ** pojedinačne kurseve, bez obaveze i bez roka."                                                                   | Enrolment isn't instant: you request access, pay, then an admin approves.                                                                                 | Mention the request → payment → approval flow.                                                                                                                                                         |
| 2.9  | `WhyUs.tsx`, "Certifikat po završetku"                                         | "…jedinstveni broj i **stranicu za provjeru**…"                                                                               | Correct, but checking needs the number **and** the holder's surname.                                                                                      | Optionally: "…broj koji poslodavac može provjeriti uz prezime vlasnika."                                                                                                                               |
| 2.10 | `siteConfig.ts` `stats` (landing stats band)                                   | 42 courses in five areas, 6,800 students, 91% completion                                                                      | Marked PLACEHOLDER, all four invented. Shown on the live landing page.                                                                                    | Use real numbers, or `stats: []` to hide the band (the code supports this).                                                                                                                            |
| 2.11 | `CertificateVerifier.tsx` helper text                                          | "Otisnut je na certifikatu, **ispod imena**."                                                                                 | The PDF prints the number in the bottom column labelled "BROJ CERTIFIKATA" (`src/lib/pdf/certificate.ts`), not under the name.                            | "Otisnut je na dnu certifikata, pod „Broj certifikata”."                                                                                                                                               |
| 2.12 | `CoursePurchasePanel.tsx` on a **free** course (price 0, shown as "Besplatno") | "Pristup kursu odobrava administrator **nakon potvrde uplate**." / "Čim **uplata** bude potvrđena…"                           | There's no payment on a free course, so the text makes no sense. The pending state may also show payment instructions.                                    | Branch on `price === 0`: e.g. "Pristup odobrava administrator." and no payment block.                                                                                                                  |
| 2.13 | `/blog` metadata description (`blog/page.tsx`)                                 | "…kako izgleda posao u IT-u, menadžmentu, **marketingu**…"                                                                    | No blog category covers marketing. The categories are Poslovanje, Lični razvoj, IT & tehnologija and Programiranje.                                       | Match the actual topics.                                                                                                                                                                               |

---

## 3. Wording, language and consistency

### 3.1 Errors to fix

| #     | Where                           | Text                                                                       | Fix                                                                                           |
| ----- | ------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 3.1.1 | `ContactForm.tsx` success toast | "Upit je poslan. **o**dgovaramo vam uskoro…"                               | Capital "Odgovaramo".                                                                         |
| 3.1.2 | `ContactForm.tsx` error toast   | „Pošalji email direktno**"** — opens with „ but closes with a straight `"` | Closing quote should be ”.                                                                    |
| 3.1.3 | `kontakt/page.tsx`              | "**Uslovi** korištenja i plaćanje"                                         | **Uvjeti** korištenja (the project uses `uvjet`, and the footer and page title say "Uvjeti"). |
| 3.1.4 | `kontakt/page.tsx`              | "**Opšti** upiti"                                                          | Bosnian: "**Opći** upiti".                                                                    |
| 3.1.5 | `blog.ts`, "Osnove Excela" post | "na osnovu **uslova**", "**uslovnog** formatiranja"                        | "uvjeta", "uvjetnog oblikovanja/formatiranja".                                                |
| 3.1.6 | `ContactForm.tsx` placeholder   | "Npr. Uvod u web **razvoj** - pitanje o zadacima"                          | Optional: hyphen → en dash (–).                                                               |

### 3.2 Mixed "ti" and "vi" forms of address

The marketing pages use the informal **ti** ("Registruj se, odaberi kurs", "Piši timu", "Nema
odgovora na tvoje pitanje?"). The catalogue, course page, purchase panel and auth pages use
formal **vi**:

- `courses/page.tsx`: "**Izaberite** kurs i **pošaljite** zahtjev za pristup."
- `CourseCatalogue.tsx`: "**Pokušajte** sa drugim pojmom…", "**svratite** ponovo"
- `CoursePurchasePanel.tsx`: "**Vaš** zahtjev čeka odobrenje…", "**Možete** poslati novi."
- `/register`: "**Počnite** učiti…", "**Potvrdite** lozinku", "Već **imate** nalog?"
- `/forgot-password`: "Poslat ćemo **vam** email…"
- `ContactForm.tsx`: the form itself uses ti ("Napiši nam…"), but its success toast says
  "odgovaramo **vam**". That's a switch within one component.
- `LegalDocumentPage.tsx`: "Ako **vam** je potreban…"

Suggestion: pick one. docs/project-context.md says marketing copy uses "ti", so either move the
public and auth pages to ti, or decide that ti applies only to the landing page. The contact
form needs fixing either way.

Smaller consistency points:

- "Zahtjev je **poslat**" (purchase panel) vs "Upit je **poslan**" (contact form). Both are
  correct Bosnian, but pick one.
- The CTA uses "**račun**" ("Prvi korak je račun", "Otvoriš račun"), while the auth pages use
  "**nalog**" ("Kreiraj nalog"). "Račun" also means _invoice_ on a page that talks about
  payment. Suggest "nalog" everywhere.
- "Odabir kursa" / "odaberi" (landing) vs "Izaberite kurs" (catalogue). Minor.

### 3.3 Registration doesn't ask for consent

`/register` has no "I accept the terms / privacy policy" checkbox and no links to them on the
form. The contact form asks for consent to the privacy policy, but registration (which stores
far more data) doesn't. Worth adding once the terms are written, since the terms are meant to
cover enrolment and payment.

---

## 4. Privacy policy text (stored in the database, but it's copy, not test data)

Skip this section if you count the legal texts as data. These points come from how the app
works, not from the test data:

- The brand is spelled "**EduBox** Žepče". Everywhere else it's "Edubox Žepče".
- It describes only **Google sign-in** data. Email-and-password registration, which is the
  main path, isn't mentioned. Also missing: purchase records and payment references, task
  submissions and attachments, messages, support requests, contact-form messages and the
  newsletter opt-in.
- It mentions "**webinarima**". The platform has no webinars.
- It says the site uses **only necessary cookies**. Course videos are YouTube embeds
  (`youtube-nocookie.com`, which still stores data once a video plays), and the theme choice
  is kept in localStorage. Processors aren't named: Supabase (database/auth), Vercel
  (hosting), Resend (email). That probably also means data is transferred outside BiH.
- It refers to "Prijava putem Google-a", but the button reads "Prijavi se sa Google nalogom" /
  "Nastavi sa Google nalogom".
- The address "Prva, Žepče" looks incomplete.
- "Odgovorićemo" and "biće objavljene" use the Serbian fused future. The project rule is
  "**odgovorit ćemo**" and "**bit će**".

---

## 5. Checked and fine

- Header links (Početna, Kursevi, `/#kako-funkcionise`, Blog, Kontakt) and their anchors.
- Footer category links (`/courses?categoryId=…`) and "Svi kursevi".
- All 15 blog posts render, and every cover image exists in `public/images/blog/`. Alt texts
  are descriptive.
- The hero image's alt text matches the picture.
- `/provjera-certifikata` copy, apart from 2.11.
- `sitemap.xml`, `robots.txt`, the manifest and the icons all return 200.
- Header/footer links to a page behind a switched-off feature flag are hidden correctly.
