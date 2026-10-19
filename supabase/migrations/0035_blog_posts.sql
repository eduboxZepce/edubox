-- 0035_blog_posts.sql
--
-- The blog moves from a typed array in `src/lib/blog.ts` into the database, so
-- an admin can write, edit and delete posts without a deploy.
--
-- ## Why this reverses the array decision
--
-- The array was chosen on the premise that posts are written once, by a
-- developer, and pasted in — publishing as a code review. In practice the
-- people writing posts are not the people with commit access, and every typo
-- fix was a release. That is the same trade that put the legal texts in the
-- database (0030), now applied to the blog.
--
-- ## Same shape as the array, deliberately
--
-- slug, title, excerpt, published_at, an optional image (path + alt), an
-- optional category and the Markdown body — exactly the fields `BlogPost` had.
-- No author, no draft flag, no tags: the reasoning that cut them from the array
-- (workflow features with no workflow behind them) still holds. A post exists
-- the moment it is saved.

-- ---------------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------------

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),

  /*
   * The URL, `/blog/{slug}`. Generated from the title on insert by the trigger
   * below and never on rename — a published address must not move. `''` is the
   * default for the same reason as `courses.slug` (0022): without it the
   * generated Insert type makes slug required and every caller invents a value
   * the trigger is about to overwrite.
   */
  slug text not null default '',

  title text not null constraint blog_posts_title_check check (length(trim(title)) > 0),

  -- Meta description and card summary. Required: it is the most SEO-relevant
  -- text after the title and the body.
  excerpt text not null constraint blog_posts_excerpt_check check (length(trim(excerpt)) > 0),

  -- Free text, not a foreign key: the blog's topics are not course categories,
  -- and the filter pills are simply the distinct values in use.
  category text,

  -- A date, not a timestamp — it is what the post shows, and what orders the
  -- index (newest first).
  published_at date not null default current_date,

  /*
   * The cover image. Either an object path in the `blog-images` bucket
   * (`{post_id}/{file}`), or — for the posts carried over from the repo — a
   * root-relative path under `public/` (`/images/blog/…`). `blogImageUrl()`
   * tells them apart by the leading slash.
   *
   * Alt text is required whenever there is an image: it is the accessible name
   * and how the image itself gets indexed, which is why `BlogPost.image` was an
   * object rather than a bare URL.
   */
  image_path text,
  image_alt text,
  constraint blog_posts_image_alt_check
    check (image_path is null or length(trim(coalesce(image_alt, ''))) > 0),

  -- Markdown, rendered by `<MarkdownContent>`. HTML inside it is escaped.
  content text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create unique index blog_posts_slug_key on public.blog_posts (slug);

-- The index page's order.
create index blog_posts_published_at_idx
  on public.blog_posts (published_at desc, created_at desc);

-- Several admins may edit one post, so `updated_by` is meaningful and the full
-- `set_updated_at()` applies (see 0031 for when to use `_only`).
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Slug generation — the course trigger from 0021, keyed on the title
-- ---------------------------------------------------------------------------

create or replace function public.blog_posts_set_slug()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base text;
  candidate text;
  suffix int := 1;
begin
  -- A supplied slug is kept as-is; the unique index rejects a duplicate (409).
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base := coalesce(public.slugify(new.title), 'clanak');
  candidate := base;

  while exists (
    select 1 from public.blog_posts where slug = candidate and id is distinct from new.id
  ) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

-- Fires on UPDATE too, but only acts when the slug was cleared — the supported
-- way to re-derive one on purpose.
create trigger blog_posts_set_slug
  before insert or update on public.blog_posts
  for each row execute function public.blog_posts_set_slug();

-- ---------------------------------------------------------------------------
-- RLS — public to read, admin to write
-- ---------------------------------------------------------------------------

alter table public.blog_posts enable row level security;

-- Every row is published (there is no draft state), so everyone may read all of
-- them. The public pages read through the anon client.
create policy "blog_posts_select_all"
  on public.blog_posts for select
  using (true);

-- Admin only, not staff: the blog speaks for the platform, not for a course
-- author.
create policy "blog_posts_admin_write"
  on public.blog_posts for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- blog-images — a public bucket, keyed by post id
-- ---------------------------------------------------------------------------
--
-- Public for the same reason as `course-thumbnails`: the blog is public content
-- read by anonymous visitors and crawlers, and `next/image` must be able to
-- fetch the original without a session. Path shape `{post_id}/{file}` — one
-- uuid segment, like thumbnails — holds both the cover and any images pasted
-- into the body, so deleting a post can clear its folder.
--
-- The editor generates the post id before the first save, so images pasted
-- into a brand-new post already have their folder.

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy "blog_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

-- Writes admin-only: a public bucket with loose write rules is an open file
-- host.
create policy "blog_images_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-images' and (select public.is_admin()));

create policy "blog_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-images' and (select public.is_admin()))
  with check (bucket_id = 'blog-images' and (select public.is_admin()));

create policy "blog_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-images' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- The posts that lived in src/lib/blog.ts
-- ---------------------------------------------------------------------------
--
-- Copied verbatim, images still pointing at `public/images/blog/`. Those files
-- stay in the repo for as long as these rows reference them; replacing a cover
-- from the admin moves that post onto the bucket.
--
-- `on conflict do nothing` so a re-run never overwrites an admin's edits.

insert into public.blog_posts
  (slug, title, excerpt, category, published_at, image_path, image_alt, content)
values
  ('sta-je-projekt-menadzment', 'Što je projekt menadžment? Vodič za početnike', 'Saznajte što je projekt menadžment, koje su njegove osnovne faze i zašto je ova vještina danas tražena u gotovo svakoj industriji.', 'Poslovanje', date '2026-06-01',
   '/images/blog/projekt-menadzment.jpg', 'Tim koji planira projekt na bijeloj ploči',
   $post$## Što je projekt menadžment?

Projekt menadžment je proces planiranja, organiziranja i vođenja resursa (ljudi, vremena, budžeta) kako bi se određeni cilj ostvario u zadanom roku. Bilo da se radi o izgradnji zgrade, lansiranju aplikacije ili organizaciji konferencije, svaki projekt prolazi kroz slične faze.

## Osnovne faze projekta

Većina projekata se odvija kroz pet ključnih faza:

- **Iniciranje** – definiranje cilja i opsega projekta
- **Planiranje** – izrada plana, budžeta i rasporeda
- **Izvršenje** – realizacija zadataka od strane tima
- **Praćenje i kontrola** – provjera da li se projekt odvija po planu
- **Zatvaranje** – finalna evaluacija i predaja rezultata

## Zašto je projekt menadžment važna vještina?

Poslodavci sve više traže ljude koji znaju upravljati zadacima, rokovima i timovima – bez obzira na to da li je pozicija formalno vezana za menadžment. Osoba koja razumije osnove projekt menadžmenta lakše organizira vlastiti rad, ali i doprinosi timu jasnijom komunikacijom i boljim planiranjem.

## Popularni alati i metodologije

Neki od najpoznatijih pristupa uključuju **Agile**, **Scrum** i **Waterfall** metodologiju. Svaka od njih ima svoje prednosti – Agile je fleksibilan i pogodan za timove koji rade u brzim ciklusima, dok je Waterfall linearniji pristup pogodan za projekte sa jasno definiranim koracima.

## Kako početi učiti projekt menadžment?

Za početak nije potreban formalni certifikat. Dovoljno je razumjeti osnovne pojmove, isprobati alate poput Trello-a ili Asane na manjim ličnim projektima, i postepeno graditi iskustvo kroz stvarne zadatke. Online obuke su odličan način da se ova znanja steknu strukturirano i uz praktične primjere.$post$),

  ('tehnike-upravljanja-vremenom', 'Tehnike upravljanja vremenom koje zaista djeluju', 'Pregled provjerenih tehnika za upravljanje vremenom – od Pomodoro tehnike do metode "pojedi žabu" – koje pomažu u borbi protiv prokrastinacije.', 'Lični razvoj', date '2026-06-07',
   '/images/blog/upravljanje-vremenom.jpg', 'Sat i planer na radnom stolu',
   $post$## Zašto je upravljanje vremenom bitno?

Upravljanje vremenom nije samo o tome da se "stigne više toga uraditi" – radi se o tome da se energija i fokus usmjere na zadatke koji zaista imaju vrijednost. Bez jasnog sistema, lako je upasti u zamku prokrastinacije i osjećaja stalne žurbe.

## Pomodoro tehnika

Jedna od najpoznatijih metoda je Pomodoro tehnika – rad u intervalima od 25 minuta, nakon čega slijedi kratka pauza od 5 minuta. Nakon četiri ciklusa, pravi se duža pauza. Ova tehnika pomaže održavanju fokusa i sprječava mentalni umor.

## Metoda "pojedi žabu"

Ova metoda se zasniva na ideji da prvo treba obaviti najteži ili najneprijatniji zadatak dana ("žabu"). Kada se on ukloni s liste, ostatak dana djeluje lakše, a osjećaj postignuća motivira za daljnji rad.

## Eisenhowerova matrica

Zadaci se dijele u četiri kategorije prema hitnosti i važnosti:

- Hitno i važno – uraditi odmah
- Važno, ali nije hitno – planirati
- Hitno, ali nije važno – delegirati
- Nije ni hitno ni važno – izbaciti sa liste

## Kako izabrati pravu tehniku?

Ne postoji univerzalno rješenje – neki ljudi bolje funkcioniraju uz kratke intervale rada, dok drugima odgovara dugotrajniji fokusiran rad. Najbolji pristup je isprobati nekoliko tehnika i zadržati onu koja donosi najbolje rezultate u svakodnevnoj rutini.$post$),

  ('kako-napisati-biznis-plan', 'Kako napisati biznis plan: osnove za početnike', 'Jednostavan vodič kroz ključne dijelove biznis plana – od analize tržišta do finansijske projekcije – za sve koji planiraju pokrenuti posao.', 'Poslovanje', date '2026-06-13',
   '/images/blog/biznis-plan.jpg', 'Osoba piše biznis plan u bilježnici',
   $post$## Što je biznis plan i zašto je potreban?

Biznis plan je dokument koji opisuje ideju, ciljeve i strategiju jednog poslovnog poduhvata. Osim što pomaže u dobivanju investicija ili kredita, biznis plan služi i kao vodič samom poduzetniku – jasno definira korake koje treba poduzeti da bi se ideja pretvorila u održiv posao.

## Ključni elementi biznis plana

Dobar biznis plan obično sadrži sljedeće dijelove:

- **Sažetak** – kratak pregled cijele ideje
- **Opis proizvoda ili usluge** – što se tačno nudi tržištu
- **Analiza tržišta** – ko su kupci i konkurencija
- **Marketinška strategija** – kako će se privući kupci
- **Operativni plan** – kako će posao funkcionirati svakodnevno
- **Finansijska projekcija** – očekivani prihodi, troškovi i profit

## Analiza tržišta i konkurencije

Prije pokretanja bilo kojeg posla, važno je istražiti ko su potencijalni kupci i što konkurencija već nudi. Ovo pomaže da se pronađe prostor za diferencijaciju – nešto što će novi posao izdvojiti od ostalih na tržištu.

## Finansijski dio plana

Finansijska projekcija ne mora biti savršena, ali treba realno prikazati očekivane troškove pokretanja, mjesečne izdatke i procjenu prihoda za prvu godinu poslovanja. Ovo je dio koji investitori i banke najviše proučavaju.

## Zaključak

Biznis plan ne mora biti dugačak da bi bio efikasan – bitno je da jasno odgovori na pitanja što se nudi, kome, i kako će posao biti profitabilan. Čak i jednostavan plan na nekoliko stranica može biti odličan početak za svaki poduhvat.$post$),

  ('liderstvo-vs-menadzment', 'Liderstvo vs menadžment: koja je razlika?', 'Iako se često koriste kao sinonimi, liderstvo i menadžment nisu isto. Otkrijte ključne razlike i zašto je oboje bitno za uspješan tim.', 'Poslovanje', date '2026-06-19',
   '/images/blog/liderstvo-menadzment.jpg', 'Voditelj tima razgovara sa kolegama',
   $post$## Da li su liderstvo i menadžment ista stvar?

U svakodnevnom govoru, riječi "lider" i "menadžer" se često koriste kao da znače isto. Ipak, u poslovnom kontekstu, ove dvije uloge imaju različit fokus i pristup radu sa ljudima.

## Što radi menadžer?

Menadžer je fokusiran na organizaciju, planiranje i kontrolu procesa. Njegov zadatak je da osigura da se zadaci obavljaju efikasno, u skladu sa rokovima i budžetom. Menadžment se najčešće oslanja na strukturu, procedure i mjerljive rezultate.

## Što radi lider?

Lider je više okrenut prema inspiriranju i motiviranju ljudi. Umjesto da se fokusira isključivo na procese, lider gradi viziju, potiče inovacije i pomaže članovima tima da rastu. Dobar lider zna prepoznati potencijal kod ljudi i usmjeriti ih prema zajedničkom cilju.

## Ključne razlike

- Menadžment se fokusira na **procese**, liderstvo na **ljude**
- Menadžeri **planiraju i kontroliraju**, lideri **inspiriraju i motiviraju**
- Menadžment teži **stabilnosti**, liderstvo teži **promjeni i rastu**

## Zašto je bitno oboje?

Uspješan tim rijetko funkcionira samo uz dobru organizaciju ili samo uz motivaciju – potrebno je oboje. Najbolji rukovodioci znaju kombinirati liderske vještine sa čvrstim menadžerskim osnovama, prilagođavajući pristup u zavisnosti od situacije i potreba tima.$post$),

  ('uvod-u-agile-i-scrum', 'Uvod u agilnu metodologiju i Scrum', 'Osnove Agile metodologije i Scrum okvira – kako timovi rade u sprintovima, ko su ključne uloge i zašto je ovaj pristup toliko popularan u IT industriji.', 'IT & tehnologija', date '2026-06-25',
   '/images/blog/agile-scrum.jpg', 'Scrum ploča sa zadacima na stikerima',
   $post$## Što je Agile metodologija?

Agile je pristup upravljanju projektima koji naglašava fleksibilnost, saradnju i postepeno isporučivanje rezultata. Umjesto da se cijeli projekt planira unaprijed do najsitnijeg detalja, rad se dijeli na manje cikluse tokom kojih se tim prilagođava promjenama i povratnim informacijama.

## Agile manifest ukratko

Agile pristup se zasniva na nekoliko osnovnih vrijednosti: ljudi i interakcija su važniji od procesa i alata, funkcionalan proizvod je važniji od opsežne dokumentacije, saradnja sa klijentom je važnija od pregovaranja oko ugovora, a reagiranje na promjenu je važnije od striktnog praćenja plana.

## Što je Scrum?

Scrum je jedan od najpopularnijih okvira zasnovanih na Agile principima. Rad se odvija u kratkim ciklusima koji se nazivaju **sprintovi**, obično u trajanju od jedne do četiri sedmice. Na kraju svakog sprinta, tim isporučuje funkcionalan dio proizvoda.

## Ključne uloge u Scrum timu

- **Product Owner** – definira prioritete i zahtjeve proizvoda
- **Scrum Master** – pomaže timu da poštuje Scrum proces i uklanja prepreke
- **Razvojni tim** – radi na isporuci zadataka iz sprinta

## Zašto se Agile i Scrum toliko koriste?

Ovaj pristup omogućava timovima da brzo reagiraju na promjene, redovno dobivaju povratne informacije i izbjegavaju situaciju u kojoj se mjesecima radi na nečemu što na kraju ne odgovara potrebama korisnika. Zbog toga je Agile postao standard u razvoju softvera, ali se sve više primjenjuje i u drugim industrijama.$post$),

  ('sta-je-git', 'Što je Git i zašto ga svaki programer treba znati', 'Git je alat koji koristi gotovo svaki programer na svijetu. Saznajte što je verzioniranje koda, kako Git funkcionira i zašto je nezaobilazan u IT industriji.', 'Programiranje', date '2026-07-01',
   '/images/blog/sta-je-git.jpg', 'Programer kuca kod na laptopu',
   $post$## Što je Git?

Git je alat za verzioniranje koda (version control system) koji programerima omogućava da prate promjene u svom kodu tokom vremena. Umjesto da se izmjene čuvaju u više kopija datoteka s različitim imenima, Git bilježi historiju svake promjene na jednom mjestu.

## Zašto je verzioniranje koda važno?

Kada više ljudi radi na istom projektu, lako može doći do konflikata i izgubljenih izmjena. Git rješava ovaj problem tako što omogućava da svaki programer radi na svojoj kopiji koda, a zatim spoji (merge) svoje izmjene sa ostatkom tima na kontroliran način.

## Osnovni pojmovi u Gitu

- **Repository** – mjesto gdje se čuva projekt i njegova historija
- **Commit** – snimak određenog stanja koda u određenom trenutku
- **Branch** – zasebna linija razvoja koja omogućava rad bez uticaja na glavni kod
- **Merge** – spajanje izmjena iz jedne grane u drugu

## GitHub, GitLab i slične platforme

Git sam po sebi je alat koji se pokreće lokalno, ali platforme poput GitHub-a i GitLab-a omogućavaju čuvanje repozitorija online, saradnju sa drugim programerima i pregled historije izmjena kroz jednostavan interfejs.

## Zašto je Git korisna vještina za početnike?

Bez obzira na to da li neko uči web razvoj, mobilne aplikacije ili rad sa podacima, poznavanje Gita je gotovo obavezno. Poslodavci očekuju osnovno znanje verzioniranja koda već na početničkim pozicijama, jer je to standardni dio svakodnevnog rada u IT industriji.$post$),

  ('html-css-javascript-osnove', 'HTML vs CSS vs JavaScript: osnove web razvoja', 'Tri osnovna gradivna elementa svake web stranice – HTML, CSS i JavaScript. Jednostavno objašnjenje razlika i uloge svakog od njih.', 'Programiranje', date '2026-07-07',
   '/images/blog/html-css-js.jpg', 'Kod prikazan na ekranu monitora',
   $post$## Tri stupa web razvoja

Svaka web stranica koju posjetite sastoji se od tri osnovne tehnologije: HTML, CSS i JavaScript. Iako rade zajedno, svaka od njih ima potpuno drugačiju ulogu.

## HTML – struktura stranice

HTML (HyperText Markup Language) je jezik koji definira strukturu sadržaja na stranici – naslove, paragrafe, slike, dugmad i linkove. Zamislite ga kao skelet kuće – bez njega, ne postoji osnova na koju bi se ostalo nadograđivalo.

## CSS – izgled i stil

CSS (Cascading Style Sheets) određuje kako stranica izgleda – boje, fontove, razmake i raspored elemenata. Ako je HTML skelet kuće, CSS je interijer i dizajn koji čini prostor privlačnim i funkcionalnim.

## JavaScript – interaktivnost

JavaScript je programski jezik koji stranici daje "život" – omogućava interakciju poput klikanja dugmadi, prikazivanja poruka, validacije formulara i dinamičkog mijenjanja sadržaja bez ponovnog učitavanja stranice.

## Kako ova tri elementa rade zajedno?

Kada otvorite bilo koju web stranicu, HTML učitava sadržaj, CSS ga stilizira, a JavaScript omogućava interakciju sa tim sadržajem. Razumijevanje ova tri jezika je prvi korak za svakoga ko želi naučiti web razvoj, bilo kroz frontend, backend ili full-stack smjer.

## Odakle početi?

Za početnike se preporučuje učenje ovim redoslijedom – prvo HTML, zatim CSS, i na kraju JavaScript. Svaki sljedeći korak nadograđuje prethodni, pa je važno dobro razumjeti osnove prije prelaska na složenije koncepte poput funkcija, petlji i rada sa podacima.$post$),

  ('sta-je-cloud-computing', 'Što je cloud computing? Jednostavno objašnjenje', 'Cloud computing je promijenio način na koji koristimo tehnologiju. Saznajte što znači "rad u oblaku" i koje su njegove najveće prednosti.', 'IT & tehnologija', date '2026-07-13',
   '/images/blog/cloud-computing.jpg', 'Ilustracija servera i oblaka koji predstavlja cloud computing',
   $post$## Što znači "cloud computing"?

Cloud computing (računarstvo u oblaku) označava korištenje udaljenih servera putem interneta za skladištenje podataka, pokretanje aplikacija i obradu informacija – umjesto da se sve to radi na lokalnom računaru.

## Svakodnevni primjeri cloud computinga

Većina ljudi koristi cloud svaki dan, a da toga možda nisu ni svjesni. Slanje datoteka putem Google Drive-a, gledanje serija na Netflixu ili čuvanje fotografija na telefonu koje se automatski sinhroniziraju online – sve su to primjeri cloud usluga.

## Glavne vrste cloud usluga

- **IaaS** (Infrastructure as a Service) – iznajmljivanje serverske infrastrukture
- **PaaS** (Platform as a Service) – gotova platforma za razvoj aplikacija
- **SaaS** (Software as a Service) – gotov softver dostupan putem interneta, poput email servisa

## Prednosti korištenja clouda

Cloud computing omogućava firmama da ne moraju kupovati skupu opremu, jer plaćaju samo resurse koje zaista koriste. Dodatno, podaci su dostupni s bilo kojeg uređaja povezanog na internet, a sigurnosne kopije se automatski čuvaju na više lokacija.

## Zašto je ovo bitno znati?

Cloud computing je osnova modernih poslovnih sistema, pa razumijevanje ovih koncepata pomaže bilo kome ko radi u IT sektoru, ali i ljudima na drugim pozicijama koji svakodnevno koriste cloud alate poput Microsoft 365 ili Google Workspace.$post$),

  ('osnove-kiberneticke-sigurnosti', 'Osnove kibernetičke sigurnosti: kako se zaštititi online', 'Jednostavan vodič kroz osnovne pojmove kibernetičke sigurnosti i praktični savjeti kako zaštititi svoje podatke i naloge na internetu.', 'IT & tehnologija', date '2026-07-19',
   '/images/blog/kiberneticka-sigurnost.jpg', 'Katanac kao simbol digitalne sigurnosti',
   $post$## Zašto je kibernetička sigurnost važna?

Sa sve većom količinom vremena koje provodimo online, zaštita ličnih i poslovnih podataka postala je neophodna vještina, ne samo za IT stručnjake već za sve korisnike interneta.

## Najčešće prijetnje

- **Phishing** – lažni emailovi ili poruke koje pokušavaju izmamiti lične podatke
- **Malware** – zlonamjerni softver koji oštećuje uređaje ili krade podatke
- **Slabe lozinke** – jedan od najčešćih uzroka kompromitiranih naloga

## Osnovne mjere zaštite

Nekoliko jednostavnih navika značajno smanjuje rizik od napada: korištenje jakih i jedinstvenih lozinki za svaki nalog, uključivanje dvofaktorske autentifikacije (2FA), redovno ažuriranje softvera i opreznost prilikom otvaranja nepoznatih linkova ili priloga.

## Kako prepoznati phishing pokušaj?

Phishing poruke često sadrže greške u pravopisu, sumnjive linkove ili traže hitnu akciju poput "vaš nalog će biti obrisan ako odmah ne kliknete ovdje". U slučaju sumnje, najbolje je direktno provjeriti kod službenog izvora, a ne kroz link iz poruke.

## Sigurnost kao svakodnevna navika

Kibernetička sigurnost ne zahtijeva tehničko obrazovanje – dovoljno je usvojiti nekoliko osnovnih navika i biti oprezan prilikom dijeljenja podataka online. Ove vještine su danas korisne u gotovo svakoj profesiji, s obzirom na to da posao sve više zavisi od digitalnih alata.$post$),

  ('sta-je-api', 'Što je API? Objašnjeno za početnike', 'API je pojam koji se često spominje u IT svijetu. Saznajte što zapravo znači, kako funkcionira i zašto je ključan dio moderne tehnologije.', 'Programiranje', date '2026-07-25',
   '/images/blog/sta-je-api.jpg', 'Ilustracija povezivanja dvije aplikacije putem API-ja',
   $post$## Što je API?

API (Application Programming Interface) je skup pravila koja omogućavaju dvjema aplikacijama da međusobno komuniciraju. Zamislite API kao konobara u restoranu – vi (aplikacija) date narudžbu konobaru (API-ju), on je prenese kuhinji (serveru), i vrati vam gotovo jelo (podatke).

## Svakodnevni primjeri korištenja API-ja

Kada koristite aplikaciju za vremensku prognozu koja prikazuje trenutnu temperaturu, ta aplikacija najvjerovatnije koristi API meteorološke službe da dobije podatke. Isto tako, plaćanje karticom online, prijava putem Google naloga ili prikaz mape u aplikaciji – sve to funkcionira zahvaljujući API-jima.

## Kako API funkcionira u praksi?

Aplikacija šalje zahtjev (request) prema serveru, navodeći što joj je potrebno. Server obrađuje taj zahtjev i vraća odgovor (response), obično u formatu koji se zove JSON – strukturiran način zapisa podataka koji je lako čitljiv i mašinama i ljudima.

## Zašto su API-ji bitni za razvoj softvera?

API-ji omogućavaju programerima da ne moraju sve graditi od nule. Umjesto da sami razvijaju sistem za slanje emailova ili obradu plaćanja, mogu koristiti gotove API-je pouzdanih servisa i tako uštedjeti vrijeme i resurse.

## Zaključak

Razumijevanje API-ja je koristan korak za svakoga ko želi učiti programiranje, jer se gotovo svaka moderna aplikacija oslanja na povezivanje sa drugim servisima putem API-ja.$post$),

  ('kako-brze-nauciti-novu-vjestinu', 'Kako brže naučiti bilo koju novu vještinu', 'Provjerene tehnike učenja koje ubrzavaju usvajanje novih vještina – od aktivnog ponavljanja do metode podučavanja drugih.', 'Lični razvoj', date '2026-07-31',
   '/images/blog/brze-ucenje.jpg', 'Osoba uči i pravi bilješke za stolom',
   $post$## Zašto neki ljudi uče brže od drugih?

Razlika često nije u talentu, već u metodi učenja. Korištenjem provjerenih tehnika, gotovo svako može značajno ubrzati usvajanje nove vještine – bilo da se radi o jeziku, programiranju ili poslovnoj vještini.

## Aktivno ponavljanje umjesto pasivnog čitanja

Samo čitanje ili gledanje video lekcija stvara lažni osjećaj znanja. Efikasnije je aktivno se prisjećati naučenog – na primjer, zatvoriti materijal i pokušati prepričati ili primijeniti ono što je upravo obrađeno.

## Metoda razmaknutog ponavljanja

Umjesto da se gradivo uči u jednom danu ("bubanje"), bolji rezultati se postižu kada se isto gradivo ponavlja u razmacima – jedan dan, pa tri dana, pa sedmicu kasnije. Ova tehnika, poznata kao spaced repetition, značajno poboljšava dugoročno pamćenje.

## Podučavanje drugih

Jedan od najefikasnijih načina da se provjeri koliko je nešto zaista naučeno jeste pokušaj da se to objasni nekome drugom jednostavnim riječima. Ako u objašnjavanju dođe do zastoja, to je znak koji dio gradiva treba dodatno utvrditi.

## Praktična primjena znanja

Teorija bez prakse rijetko ostaje trajno usvojena. Najbrži napredak se ostvaruje kada se novo znanje odmah primijeni na konkretnom, malom projektu – time se gradivo povezuje sa stvarnim iskustvom, što olakšava pamćenje.$post$),

  ('savjeti-za-javni-govor', 'Savjeti za javni govor za početnike', 'Javni govor je vještina koja se uči i vježba. Evo praktičnih savjeta za savladavanje treme i pripremu uspješnog nastupa pred publikom.', 'Lični razvoj', date '2026-08-06',
   '/images/blog/javni-govor.jpg', 'Govornik drži prezentaciju pred publikom',
   $post$## Zašto je javni govor važna vještina?

Bilo da se radi o prezentaciji na poslu, izlaganju na fakultetu ili predstavljanju ideje pred timom, sposobnost jasnog i samouvjerenog govora pred publikom otvara mnoge prilike u karijeri.

## Priprema je ključna

Dobar nastup rijetko je slučajan – najčešće je rezultat pripreme. Korisno je unaprijed napraviti strukturu govora sa jasnim uvodom, glavnim dijelom i zaključkom, umjesto da se govornik oslanja isključivo na improvizaciju.

## Kako savladati tremu?

Trema je potpuno normalna, čak i kod iskusnih govornika. Nekoliko tehnika može pomoći: duboko disanje prije nastupa, vježbanje govora naglas kod kuće, i fokusiranje na poruku koja se prenosi umjesto na strah od ocjenjivanja.

## Govor tijela i ton glasa

Način na koji nešto kažemo često je jednako važan kao i sam sadržaj. Održavanje kontakta očima, uspravno držanje i variranje tona glasa čine izlaganje dinamičnijim i lakšim za praćenje.

## Vježba čini majstora

Kao i svaka druga vještina, javni govor se poboljšava isključivo kroz praksu. Svaki novi nastup, čak i pred manjom grupom ljudi, gradi samopouzdanje i postepeno smanjuje strah od javnog nastupa.$post$),

  ('kako-izgraditi-licni-brend', 'Kako izgraditi lični brend online', 'Lični brend nije rezerviran samo za influensere. Saznajte kako izgraditi prepoznatljivo online prisustvo koje otvara poslovne prilike.', 'Poslovanje', date '2026-08-12',
   '/images/blog/licni-brend.jpg', 'Osoba koristi laptop za rad na društvenim mrežama',
   $post$## Što je lični brend?

Lični brend predstavlja način na koji vas drugi doživljavaju na osnovu onoga što dijelite, kako komunicirate i koje vrijednosti predstavljate – online i izvan interneta. Ne odnosi se samo na poznate ličnosti, već na svakoga ko želi izgraditi profesionalnu reputaciju.

## Zašto je lični brend bitan?

U svijetu gdje poslodavci i klijenti često prvo pogledaju nečiji online profil, dobro izgrađen lični brend može otvoriti vrata poslovnim prilikama, saradnjama i novim poznanstvima u struci.

## Prvi koraci u izgradnji brenda

- Definirati oblast u kojoj se želite pozicionirati kao stručnjak
- Izabrati platformu koja najviše odgovara toj oblasti (LinkedIn, Instagram, blog)
- Redovno dijeliti sadržaj koji donosi vrijednost drugima
- Biti dosljedan u tonu i temama kojima se bavite

## Autentičnost je ključna

Ljudi prepoznaju kada je nešto neiskreno. Najjači lični brendovi su oni koji odražavaju stvarne vrijednosti i znanje osobe, a ne pokušaj da se oponaša neko drugi.

## Strpljenje i dosljednost

Izgradnja ličnog brenda nije proces koji se događa preko noći. Potrebno je vrijeme, redovno objavljivanje i strpljenje – ali dugoročno, ovo je jedna od najvrednijih investicija u vlastitu karijeru.$post$),

  ('freelancing-101-kako-poceti', 'Freelancing 101: kako početi', 'Sve što trebate znati za početak freelance karijere – od izbora niše i platformi do prvih klijenata i postavljanja cijena.', 'Poslovanje', date '2026-08-18',
   '/images/blog/freelancing.jpg', 'Freelancer radi na laptopu u kafiću',
   $post$## Što je freelancing?

Freelancing podrazumijeva rad kao samostalni izvođač usluga, bez stalnog poslodavca. Freelanceri sami biraju klijente, projekte i raspored rada, što ovaj oblik zaposlenja čini privlačnim mnogima koji traže fleksibilnost.

## Izbor niše

Prvi korak je odabir oblasti u kojoj postoje vještine koje se mogu ponuditi tržištu – programiranje, dizajn, pisanje, prevođenje ili digitalni marketing su samo neki od popularnih pravaca. Fokusiranje na specifičnu nišu olakšava izgradnju reputacije.

## Gdje pronaći prve klijente?

Platforme poput Upwork-a, Fiverr-a i Freelancer.com omogućavaju povezivanje sa klijentima širom svijeta. Pored toga, lične preporuke i mreža kontakata često su najvredniji izvor prvih poslova.

## Kako odrediti cijenu usluga?

Početnicima se često preporučuje da istraže cijene na tržištu za sličan nivo iskustva, a zatim postave konkurentnu, ali fer cijenu. Vremenom, kako se gradi portfolio i reputacija, cijene se mogu postepeno povećavati.

## Organizacija i disciplina

Bez fiksnog radnog vremena, samodisciplina postaje ključna. Uspješni freelanceri obično imaju jasan raspored, vode evidenciju o projektima i rokovima, i redovno komuniciraju sa klijentima kako bi izgradili povjerenje i dugoročnu saradnju.$post$),

  ('osnove-excela', 'Osnove Excela koje bi svako trebao znati', 'Excel je jedan od najkorisnijih alata u poslovnom svijetu. Pregled osnovnih funkcija i formula koje olakšavaju svakodnevni rad sa podacima.', 'IT & tehnologija', date '2026-08-24',
   '/images/blog/osnove-excela.jpg', 'Tabela sa podacima otvorena u Excelu',
   $post$## Zašto je Excel i dalje toliko popularan?

Iako postoje mnogi noviji alati za rad sa podacima, Excel ostaje jedan od najkorištenijih programa u poslovnom svijetu. Njegova fleksibilnost omogućava sve, od jednostavnih tabela do složenih finansijskih analiza.

## Osnovne funkcije koje treba znati

- **SUM** – sabiranje vrijednosti u opsegu ćelija
- **AVERAGE** – izračunavanje prosjeka
- **IF** – logička funkcija koja vraća rezultat na osnovu uvjeta
- **VLOOKUP / XLOOKUP** – pretraga podataka u drugoj tabeli ili koloni

## Formatiranje i organizacija podataka

Pravilno formatiranje tabela – korištenje zaglavlja, filtera i uvjetnog formatiranja – olakšava čitanje i analizu podataka, posebno kada se radi sa velikim količinama informacija.

## Pivot tabele

Pivot tabele omogućavaju brzo sažimanje i analizu velikih setova podataka bez potrebe za pisanjem složenih formula. Ova funkcija je posebno korisna za izradu izvještaja i praćenje poslovnih pokazatelja.

## Zašto naučiti Excel danas?

Bez obzira na industriju, poznavanje Excela olakšava svakodnevne zadatke – od vođenja budžeta do analize prodaje. To je vještina koja se traži na gotovo svakom radnom mjestu koje uključuje rad sa podacima, brojevima ili izvještajima.$post$)

on conflict (slug) do nothing;
