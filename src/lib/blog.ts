/**
 * Blog posts, as data.
 *
 * ## Why an array and not a table
 *
 * The blog exists for indexable public content, not for a publishing workflow.
 * A handful of articles in a typed array beats a `posts` table plus an admin
 * editor plus RLS policies plus an upload path for images — and it makes
 * publishing a code review instead of a database write.
 *
 * Deliberately minimal: no author, no reading time, no draft flag, no tags.
 * Those are workflow features, and there is no workflow here — the posts are
 * written once, for SEO, and pasted in.
 *
 * ## Adding a post
 *
 * Append an entry to `BLOG_POSTS`. **Array order is display order**, so put the
 * newest first. `slug` is the URL and must be unique — `/blog/[slug]` looks the
 * post up by it and 404s when there is no match, so a typo fails visibly rather
 * than rendering an empty page.
 *
 * ## `content` is Markdown, and there is one trap
 *
 * Because it lives in a TypeScript template literal, **a ``` code fence would
 * terminate the string**. Markdown accepts `~~~` as an equivalent fence, so use
 * that:
 *
 *     content: `
 *     ## Naslov
 *
 *     ~~~js
 *     const x = 1;
 *     ~~~
 *     `,
 *
 * Inline code still needs an escaped backtick (\`npm run dev\`).
 *
 * Nothing parses the Markdown yet — `/blog/[slug]` prints it as preformatted
 * text. The renderer and its styling are a separate step.
 */
export type BlogPost = {
  /**
   * The URL segment, and the post's identity — `/blog/{slug}`.
   *
   * Lowercase, hyphens, no diacritics: `sta-je-git`, not `šta-je-git`.
   *
   * **A published slug must never change.** It is an address; changing it
   * breaks inbound links and discards whatever ranking the post earned. Same
   * rule as `courses.slug`.
   */
  slug: string;

  /** The headline. Becomes the `<h1>` and, with a suffix, the `<title>`. */
  title: string;

  /**
   * One or two sentences, roughly 120–160 characters.
   *
   * This is the meta description as well as the index card's summary, so write
   * it for a stranger reading a search result — it is the most SEO-relevant
   * field after the title and the content itself.
   */
  excerpt: string;

  /**
   * ISO date, `2026-08-27`.
   *
   * Kept even though ordering is by array position: it fills the article
   * metadata and is shown on the post. Whether to *display* it is a separate
   * call — a visible old date can make a post read as abandoned.
   */
  publishedAt: string;

  /**
   * Header image. `src` is a path under `public/` (e.g.
   * `/blog/sta-je-git/cover.jpg`), so it is a static asset with no remote
   * pattern to configure.
   *
   * An object rather than a bare URL because `alt` is not optional: it is both
   * the accessible name and how the image itself gets indexed. There is no
   * `width`/`height` — the page fixes the aspect ratio in CSS, which is what
   * those were guarding against.
   */
  image?: { src: string; alt: string };

  /**
 * Best-guess category per post - used for the filter pills on the blog
 * index. Not part of the original schema; assigned when the filter UI
 * was added. Review/adjust per post as needed.
 */
category?: string;

  /** The article body, in Markdown. See the fence trap above. */
  content: string;
};



/**
 * The posts, newest first.
 *
 * Empty on purpose rather than seeded with lorem ipsum: a placeholder post
 * would be indexable, and search engines would find it before anyone
 * remembered to delete it.
 *
 * A filled-in entry looks like this:
 *
 * ```ts
 * {
 *   slug: 'sta-je-git',
 *   title: 'Šta je Git i zašto ga koristiti',
 *   excerpt: 'Kratak uvod u verzionisanje koda i razlog zbog kojeg ga koristi svaki tim.',
 *   publishedAt: '2026-08-27',
 *   image: {
 *     src: '/blog/sta-je-git/cover.jpg',
 *     alt: 'Terminal sa ispisom git log komande',
 *   },
 *   content: `
 * ## Uvod
 *
 * Tekst se piše u **Markdownu**.
 * `,
 * }
 * ```
 */

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'sta-je-projekt-menadzment',
    title: 'Šta je projekt menadžment? Vodič za početnike',
    category: 'Poslovanje',
    excerpt:
      'Saznajte šta je projekt menadžment, koje su njegove osnovne faze i zašto je ova vještina danas tražena u gotovo svakoj industriji.',
    publishedAt: '2026-06-01',
    image: {
      src: '/images/blog/projekt-menadzment.jpg',
      alt: 'Tim koji planira projekat na bijeloj tabli',
    },
    content: `## Šta je projekt menadžment?

Projekt menadžment je proces planiranja, organizovanja i vođenja resursa (ljudi, vremena, budžeta) kako bi se određeni cilj ostvario u zadatom roku. Bilo da se radi o izgradnji zgrade, lansiranju aplikacije ili organizaciji konferencije, svaki projekat prolazi kroz slične faze.

## Osnovne faze projekta

Većina projekata se odvija kroz pet ključnih faza:

- **Iniciranje** – definisanje cilja i opsega projekta
- **Planiranje** – izrada plana, budžeta i rasporeda
- **Izvršenje** – realizacija zadataka od strane tima
- **Praćenje i kontrola** – provjera da li se projekat odvija po planu
- **Zatvaranje** – finalna evaluacija i predaja rezultata

## Zašto je projekt menadžment važna vještina?

Poslodavci sve više traže ljude koji znaju upravljati zadacima, rokovima i timovima – bez obzira na to da li je pozicija formalno vezana za menadžment. Osoba koja razumije osnove projekt menadžmenta lakše organizuje sopstveni rad, ali i doprinosi timu jasnijom komunikacijom i boljim planiranjem.

## Popularni alati i metodologije

Neki od najpoznatijih pristupa uključuju **Agile**, **Scrum** i **Waterfall** metodologiju. Svaka od njih ima svoje prednosti – Agile je fleksibilan i pogodan za timove koji rade u brzim ciklusima, dok je Waterfall linearniji pristup pogodan za projekte sa jasno definisanim koracima.

## Kako početi učiti projekt menadžment?

Za početak nije potreban formalni certifikat. Dovoljno je razumjeti osnovne pojmove, isprobati alate poput Trello-a ili Asane na manjim ličnim projektima, i postepeno graditi iskustvo kroz stvarne zadatke. Online kursevi su odličan način da se ova znanja steknu strukturirano i uz praktične primjere.`,
  },
  {
    slug: 'tehnike-upravljanja-vremenom',
    title: 'Tehnike upravljanja vremenom koje zaista djeluju',
    category: 'Lični razvoj',
    excerpt:
      'Pregled provjerenih tehnika za upravljanje vremenom – od Pomodoro tehnike do metode "pojedi žabu" – koje pomažu u borbi protiv prokrastinacije.',
    publishedAt: '2026-06-07',
    image: {
      src: '/images/blog/upravljanje-vremenom.jpg',
      alt: 'Sat i planer na radnom stolu',
    },
    content: `## Zašto je upravljanje vremenom bitno?

Upravljanje vremenom nije samo o tome da se "stigne više toga uraditi" – radi se o tome da se energija i fokus usmjere na zadatke koji zaista imaju vrijednost. Bez jasnog sistema, lako je upasti u zamku prokrastinacije i osjećaja stalne žurbe.

## Pomodoro tehnika

Jedna od najpoznatijih metoda je Pomodoro tehnika – rad u intervalima od 25 minuta, nakon čega slijedi kratka pauza od 5 minuta. Nakon četiri ciklusa, pravi se duža pauza. Ova tehnika pomaže održavanju fokusa i sprječava mentalni umor.

## Metoda "pojedi žabu"

Ova metoda se zasniva na ideji da prvo treba obaviti najteži ili najneprijatniji zadatak dana ("žabu"). Kada se on ukloni s liste, ostatak dana djeluje lakše, a osjećaj postignuća motiviše za dalji rad.

## Eisenhowerova matrica

Zadaci se dijele u četiri kategorije prema hitnosti i važnosti:

- Hitno i važno – uraditi odmah
- Važno, ali nije hitno – planirati
- Hitno, ali nije važno – delegirati
- Nije ni hitno ni važno – izbaciti sa liste

## Kako izabrati pravu tehniku?

Ne postoji univerzalno rješenje – neki ljudi bolje funkcionišu uz kratke intervale rada, dok drugima odgovara dugotrajniji fokusiran rad. Najbolji pristup je isprobati nekoliko tehnika i zadržati onu koja donosi najbolje rezultate u svakodnevnoj rutini.`,
  },
  {
    slug: 'kako-napisati-biznis-plan',
    title: 'Kako napisati biznis plan: osnove za početnike',
    category: 'Poslovanje',
    excerpt:
      'Jednostavan vodič kroz ključne dijelove biznis plana – od analize tržišta do finansijske projekcije – za sve koji planiraju pokrenuti posao.',
    publishedAt: '2026-06-13',
    image: {
      src: '/images/blog/biznis-plan.jpg',
      alt: 'Osoba piše biznis plan u bilježnici',
    },
    content: `## Šta je biznis plan i zašto je potreban?

Biznis plan je dokument koji opisuje ideju, ciljeve i strategiju jednog poslovnog poduhvata. Osim što pomaže u dobijanju investicija ili kredita, biznis plan služi i kao vodič samom preduzetniku – jasno definiše korake koje treba preduzeti da bi se ideja pretvorila u održiv posao.

## Ključni elementi biznis plana

Dobar biznis plan obično sadrži sljedeće dijelove:

- **Sažetak** – kratak pregled cijele ideje
- **Opis proizvoda ili usluge** – šta se tačno nudi tržištu
- **Analiza tržišta** – ko su kupci i konkurencija
- **Marketinška strategija** – kako će se privući kupci
- **Operativni plan** – kako će posao funkcionisati svakodnevno
- **Finansijska projekcija** – očekivani prihodi, troškovi i profit

## Analiza tržišta i konkurencije

Prije pokretanja bilo kog posla, važno je istražiti ko su potencijalni kupci i šta konkurencija već nudi. Ovo pomaže da se pronađe prostor za diferencijaciju – nešto što će novi posao izdvojiti od ostalih na tržištu.

## Finansijski dio plana

Finansijska projekcija ne mora biti savršena, ali treba realno prikazati očekivane troškove pokretanja, mjesečne izdatke i procjenu prihoda za prvu godinu poslovanja. Ovo je dio koji investitori i banke najviše proučavaju.

## Zaključak

Biznis plan ne mora biti dugačak da bi bio efikasan – bitno je da jasno odgovori na pitanja šta se nudi, kome, i kako će posao biti profitabilan. Čak i jednostavan plan na nekoliko stranica može biti odličan početak za svaki poduhvat.`,
  },
  {
    slug: 'liderstvo-vs-menadzment',
    title: 'Liderstvo vs menadžment: koja je razlika?',
    category: 'Poslovanje',
    excerpt:
      'Iako se često koriste kao sinonimi, liderstvo i menadžment nisu isto. Otkrijte ključne razlike i zašto je oboje bitno za uspješan tim.',
    publishedAt: '2026-06-19',
    image: {
      src: '/images/blog/liderstvo-menadzment.jpg',
      alt: 'Voditelj tima razgovara sa kolegama',
    },
    content: `## Da li su liderstvo i menadžment ista stvar?

U svakodnevnom govoru, riječi "lider" i "menadžer" se često koriste kao da znače isto. Ipak, u poslovnom kontekstu, ove dvije uloge imaju različit fokus i pristup radu sa ljudima.

## Šta radi menadžer?

Menadžer je fokusiran na organizaciju, planiranje i kontrolu procesa. Njegov zadatak je da osigura da se zadaci obavljaju efikasno, u skladu sa rokovima i budžetom. Menadžment se najčešće oslanja na strukturu, procedure i mjerljive rezultate.

## Šta radi lider?

Lider je više okrenut ka inspirisanju i motivisanju ljudi. Umjesto da se fokusira isključivo na procese, lider gradi viziju, podstiče inovacije i pomaže članovima tima da rastu. Dobar lider zna prepoznati potencijal kod ljudi i usmjeriti ih ka zajedničkom cilju.

## Ključne razlike

- Menadžment se fokusira na **procese**, liderstvo na **ljude**
- Menadžeri **planiraju i kontrolišu**, lideri **inspirišu i motivišu**
- Menadžment teži **stabilnosti**, liderstvo teži **promjeni i rastu**

## Zašto je bitno oboje?

Uspješan tim rijetko funkcioniše samo uz dobru organizaciju ili samo uz motivaciju – potrebno je oboje. Najbolji rukovodioci znaju kombinovati liderske vještine sa čvrstim menadžerskim osnovama, prilagođavajući pristup u zavisnosti od situacije i potreba tima.`,
  },
  {
    slug: 'uvod-u-agile-i-scrum',
    title: 'Uvod u agilnu metodologiju i Scrum',
    category: 'IT & tehnologija',
    excerpt:
      'Osnove Agile metodologije i Scrum okvira – kako timovi rade u sprintovima, ko su ključne uloge i zašto je ovaj pristup toliko popularan u IT industriji.',
    publishedAt: '2026-06-25',
    image: {
      src: '/images/blog/agile-scrum.jpg',
      alt: 'Scrum tabla sa zadacima na stikerima',
    },
    content: `## Šta je Agile metodologija?

Agile je pristup upravljanju projektima koji naglašava fleksibilnost, saradnju i postepeno isporučivanje rezultata. Umjesto da se cijeli projekat planira unaprijed do najsitnijeg detalja, rad se dijeli na manje cikluse tokom kojih se tim prilagođava promjenama i povratnim informacijama.

## Agile manifest ukratko

Agile pristup se zasniva na nekoliko osnovnih vrijednosti: ljudi i interakcija su važniji od procesa i alata, funkcionalan proizvod je važniji od opsežne dokumentacije, saradnja sa klijentom je važnija od pregovaranja oko ugovora, a reagovanje na promjenu je važnije od striktnog praćenja plana.

## Šta je Scrum?

Scrum je jedan od najpopularnijih okvira zasnovanih na Agile principima. Rad se odvija u kratkim ciklusima koji se nazivaju **sprintovi**, obično u trajanju od jedne do četiri sedmice. Na kraju svakog sprinta, tim isporučuje funkcionalan dio proizvoda.

## Ključne uloge u Scrum timu

- **Product Owner** – definiše prioritete i zahtjeve proizvoda
- **Scrum Master** – pomaže timu da poštuje Scrum proces i uklanja prepreke
- **Razvojni tim** – radi na isporuci zadataka iz sprinta

## Zašto se Agile i Scrum toliko koriste?

Ovaj pristup omogućava timovima da brzo reaguju na promjene, redovno dobijaju povratne informacije i izbjegavaju situaciju u kojoj se mjesecima radi na nečemu što na kraju ne odgovara potrebama korisnika. Zbog toga je Agile postao standard u razvoju softvera, ali se sve više primjenjuje i u drugim industrijama.`,
  },
  {
    slug: 'sta-je-git',
    title: 'Šta je Git i zašto ga svaki programer treba znati',
    category: 'Programiranje',
    excerpt:
      'Git je alat koji koristi gotovo svaki programer na svijetu. Saznajte šta je verzionisanje koda, kako Git funkcioniše i zašto je nezaobilazan u IT industriji.',
    publishedAt: '2026-07-01',
    image: {
      src: '/images/blog/sta-je-git.jpg',
      alt: 'Programer kuca kod na laptopu',
    },
    content: `## Šta je Git?

Git je alat za verzionisanje koda (version control system) koji programerima omogućava da prate promjene u svom kodu tokom vremena. Umjesto da se izmjene čuvaju u više kopija fajlova sa različitim imenima, Git bilježi historiju svake promjene na jednom mjestu.

## Zašto je verzionisanje koda važno?

Kada više ljudi radi na istom projektu, lako može doći do konflikata i izgubljenih izmjena. Git rješava ovaj problem tako što omogućava da svaki programer radi na svojoj kopiji koda, a zatim spoji (merge) svoje izmjene sa ostatkom tima na kontrolisan način.

## Osnovni pojmovi u Gitu

- **Repository** – mjesto gdje se čuva projekat i njegova historija
- **Commit** – snimak određenog stanja koda u određenom trenutku
- **Branch** – zasebna linija razvoja koja omogućava rad bez uticaja na glavni kod
- **Merge** – spajanje izmjena iz jedne grane u drugu

## GitHub, GitLab i slične platforme

Git sam po sebi je alat koji se pokreće lokalno, ali platforme poput GitHub-a i GitLab-a omogućavaju čuvanje repozitorija online, saradnju sa drugim programerima i pregled historije izmjena kroz jednostavan interfejs.

## Zašto je Git korisna vještina za početnike?

Bez obzira na to da li neko uči web razvoj, mobilne aplikacije ili rad sa podacima, poznavanje Gita je gotovo obavezno. Poslodavci očekuju osnovno znanje verzionisanja koda već na početničkim pozicijama, jer je to standardni dio svakodnevnog rada u IT industriji.`,
  },
  {
    slug: 'html-css-javascript-osnove',
    title: 'HTML vs CSS vs JavaScript: osnove web razvoja',
    category: 'Programiranje',
    excerpt:
      'Tri osnovna gradivna elementa svake web stranice – HTML, CSS i JavaScript. Jednostavno objašnjenje razlika i uloge svakog od njih.',
    publishedAt: '2026-07-07',
    image: {
      src: '/images/blog/html-css-js.jpg',
      alt: 'Kod prikazan na ekranu monitora',
    },
    content: `## Tri stuba web razvoja

Svaka web stranica koju posjetite sastoji se od tri osnovne tehnologije: HTML, CSS i JavaScript. Iako rade zajedno, svaka od njih ima potpuno drugačiju ulogu.

## HTML – struktura stranice

HTML (HyperText Markup Language) je jezik koji definiše strukturu sadržaja na stranici – naslove, paragrafe, slike, dugmad i linkove. Zamislite ga kao skelet kuće – bez njega, ne postoji osnova na koju bi se ostalo nadograđivalo.

## CSS – izgled i stil

CSS (Cascading Style Sheets) određuje kako stranica izgleda – boje, fontove, razmake i raspored elemenata. Ako je HTML skelet kuće, CSS je enterijer i dizajn koji čini prostor privlačnim i funkcionalnim.

## JavaScript – interaktivnost

JavaScript je programski jezik koji stranici daje "život" – omogućava interakciju poput klikanja dugmadi, prikazivanja poruka, validacije formulara i dinamičkog mijenjanja sadržaja bez ponovnog učitavanja stranice.

## Kako ova tri elementa rade zajedno?

Kada otvorite bilo koju web stranicu, HTML učitava sadržaj, CSS ga stilizuje, a JavaScript omogućava interakciju sa tim sadržajem. Razumijevanje ova tri jezika je prvi korak za svakoga ko želi da nauči web razvoj, bilo kroz frontend, backend ili full-stack smjer.

## Odakle početi?

Za početnike se preporučuje učenje ovim redoslijedom – prvo HTML, zatim CSS, i na kraju JavaScript. Svaki sljedeći korak nadograđuje prethodni, pa je važno dobro razumjeti osnove prije prelaska na složenije koncepte poput funkcija, petlji i rada sa podacima.`,
  },
  {
    slug: 'sta-je-cloud-computing',
    title: 'Šta je cloud computing? Jednostavno objašnjenje',
    category: 'IT & tehnologija',
    excerpt:
      'Cloud computing je promijenio način na koji koristimo tehnologiju. Saznajte šta znači "rad u oblaku" i koje su njegove najveće prednosti.',
    publishedAt: '2026-07-13',
    image: {
      src: '/images/blog/cloud-computing.jpg',
      alt: 'Ilustracija servera i oblaka koji predstavlja cloud computing',
    },
    content: `## Šta znači "cloud computing"?

Cloud computing (računarstvo u oblaku) označava korištenje udaljenih servera putem interneta za skladištenje podataka, pokretanje aplikacija i obradu informacija – umjesto da se sve to radi na lokalnom računaru.

## Svakodnevni primjeri cloud computinga

Većina ljudi koristi cloud svaki dan, a da toga možda nisu ni svjesni. Slanje fajlova putem Google Drive-a, gledanje serija na Netflixu ili čuvanje fotografija na telefonu koje se automatski sinhronizuju online – sve su to primjeri cloud usluga.

## Glavne vrste cloud usluga

- **IaaS** (Infrastructure as a Service) – iznajmljivanje serverske infrastrukture
- **PaaS** (Platform as a Service) – gotova platforma za razvoj aplikacija
- **SaaS** (Software as a Service) – gotov softver dostupan putem interneta, poput email servisa

## Prednosti korištenja clouda

Cloud computing omogućava firmama da ne moraju kupovati skupu opremu, jer plaćaju samo resurse koje zaista koriste. Dodatno, podaci su dostupni sa bilo kog uređaja povezanog na internet, a sigurnosne kopije se automatski čuvaju na više lokacija.

## Zašto je ovo bitno znati?

Cloud computing je osnova modernih poslovnih sistema, pa razumijevanje ovih koncepata pomaže bilo kome ko radi u IT sektoru, ali i ljudima na drugim pozicijama koji svakodnevno koriste cloud alate poput Microsoft 365 ili Google Workspace.`,
  },
  {
    slug: 'osnove-kiberneticke-sigurnosti',
    title: 'Osnove kibernetičke sigurnosti: kako se zaštititi online',
    category: 'IT & tehnologija',
    excerpt:
      'Jednostavan vodič kroz osnovne pojmove kibernetičke sigurnosti i praktični savjeti kako zaštititi svoje podatke i naloge na internetu.',
    publishedAt: '2026-07-19',
    image: {
      src: '/images/blog/kiberneticka-sigurnost.jpg',
      alt: 'Katanac kao simbol digitalne sigurnosti',
    },
    content: `## Zašto je kibernetička sigurnost važna?

Sa sve većom količinom vremena koje provodimo online, zaštita ličnih i poslovnih podataka postala je neophodna vještina, ne samo za IT stručnjake već za sve korisnike interneta.

## Najčešće prijetnje

- **Phishing** – lažni emailovi ili poruke koje pokušavaju da izmame lične podatke
- **Malware** – zlonamjerni softver koji oštećuje uređaje ili krade podatke
- **Slabe lozinke** – jedan od najčešćih uzroka kompromitovanih naloga

## Osnovne mjere zaštite

Nekoliko jednostavnih navika značajno smanjuje rizik od napada: korištenje jakih i jedinstvenih lozinki za svaki nalog, uključivanje dvofaktorske autentifikacije (2FA), redovno ažuriranje softvera i opreznost prilikom otvaranja nepoznatih linkova ili priloga.

## Kako prepoznati phishing pokušaj?

Phishing poruke često sadrže greške u pravopisu, sumnjive linkove ili traže hitnu akciju poput "vaš nalog će biti obrisan ako odmah ne kliknete ovdje". U slučaju sumnje, najbolje je direktno provjeriti kod zvaničnog izvora, a ne kroz link iz poruke.

## Sigurnost kao svakodnevna navika

Kibernetička sigurnost ne zahtijeva tehničko obrazovanje – dovoljno je usvojiti nekoliko osnovnih navika i biti oprezan prilikom dijeljenja podataka online. Ove vještine su danas korisne u gotovo svakoj profesiji, s obzirom na to da posao sve više zavisi od digitalnih alata.`,
  },
  {
    slug: 'sta-je-api',
    title: 'Šta je API? Objašnjeno za početnike',
    category: 'Programiranje',
    excerpt:
      'API je pojam koji se često spominje u IT svijetu. Saznajte šta zapravo znači, kako funkcioniše i zašto je ključan dio moderne tehnologije.',
    publishedAt: '2026-07-25',
    image: {
      src: '/images/blog/sta-je-api.jpg',
      alt: 'Ilustracija povezivanja dvije aplikacije putem API-ja',
    },
    content: `## Šta je API?

API (Application Programming Interface) je skup pravila koja omogućavaju dvjema aplikacijama da međusobno komuniciraju. Zamislite API kao konobara u restoranu – vi (aplikacija) date narudžbu konobaru (API-ju), on je prenese kuhinji (serveru), i vrati vam gotovo jelo (podatke).

## Svakodnevni primjeri korištenja API-ja

Kada koristite aplikaciju za vremensku prognozu koja prikazuje trenutnu temperaturu, ta aplikacija najvjerovatnije koristi API meteorološke službe da dobije podatke. Isto tako, plaćanje karticom online, prijava putem Google naloga ili prikaz mape u aplikaciji – sve to funkcioniše zahvaljujući API-jima.

## Kako API funkcioniše u praksi?

Aplikacija šalje zahtjev (request) prema serveru, navodeći šta joj je potrebno. Server obrađuje taj zahtjev i vraća odgovor (response), obično u formatu koji se zove JSON – strukturiran način zapisa podataka koji je lako čitljiv i mašinama i ljudima.

## Zašto su API-ji bitni za razvoj softvera?

API-ji omogućavaju programerima da ne moraju sve graditi od nule. Umjesto da sami razvijaju sistem za slanje emailova ili obradu plaćanja, mogu koristiti gotove API-je pouzdanih servisa i tako uštedjeti vrijeme i resurse.

## Zaključak

Razumijevanje API-ja je koristan korak za svakog ko želi da uči programiranje, jer se gotovo svaka moderna aplikacija oslanja na povezivanje sa drugim servisima putem API-ja.`,
  },
  {
    slug: 'kako-brze-nauciti-novu-vjestinu',
    title: 'Kako brže naučiti bilo koju novu vještinu',
    category: 'Lični razvoj',
    excerpt:
      'Provjerene tehnike učenja koje ubrzavaju usvajanje novih vještina – od aktivnog ponavljanja do metode podučavanja drugih.',
    publishedAt: '2026-07-31',
    image: {
      src: '/images/blog/brze-ucenje.jpg',
      alt: 'Osoba uči i pravi bilješke za stolom',
    },
    content: `## Zašto neki ljudi uče brže od drugih?

Razlika često nije u talentu, već u metodi učenja. Korištenjem provjerenih tehnika, gotovo svako može značajno ubrzati usvajanje nove vještine – bilo da se radi o jeziku, programiranju ili poslovnoj vještini.

## Aktivno ponavljanje umjesto pasivnog čitanja

Samo čitanje ili gledanje video lekcija stvara lažni osjećaj znanja. Efikasnije je aktivno se prisjećati naučenog – na primjer, zatvoriti materijal i pokušati prepričati ili primijeniti ono što je upravo obrađeno.

## Metoda razmaknutog ponavljanja

Umjesto da se gradivo uči u jednom danu ("bubanje"), bolji rezultati se postižu kada se isto gradivo ponavlja u razmacima – jedan dan, pa tri dana, pa sedmicu kasnije. Ova tehnika, poznata kao spaced repetition, značajno poboljšava dugoročno pamćenje.

## Podučavanje drugih

Jedan od najefikasnijih načina da se provjeri koliko je nešto zaista naučeno jeste pokušaj da se to objasni nekome drugom jednostavnim riječima. Ako u objašnjavanju dođe do zastoja, to je znak koji dio gradiva treba dodatno utvrditi.

## Praktična primjena znanja

Teorija bez prakse rijetko ostaje trajno usvojena. Najbrži napredak se ostvaruje kada se novo znanje odmah primijeni na konkretnom, malom projektu – time se gradivo povezuje sa stvarnim iskustvom, što olakšava pamćenje.`,
  },
  {
    slug: 'savjeti-za-javni-govor',
    title: 'Savjeti za javni govor za početnike',
    category: 'Lični razvoj',
    excerpt:
      'Javni govor je vještina koja se uči i vježba. Evo praktičnih savjeta za savladavanje treme i pripremu uspješnog nastupa pred publikom.',
    publishedAt: '2026-08-06',
    image: {
      src: '/images/blog/javni-govor.jpg',
      alt: 'Govornik drži prezentaciju pred publikom',
    },
    content: `## Zašto je javni govor važna vještina?

Bilo da se radi o prezentaciji na poslu, izlaganju na fakultetu ili predstavljanju ideje pred timom, sposobnost jasnog i samouvjerenog govora pred publikom otvara mnoge prilike u karijeri.

## Priprema je ključna

Dobar nastup rijetko je slučajan – najčešće je rezultat pripreme. Korisno je unaprijed napraviti strukturu govora sa jasnim uvodom, glavnim dijelom i zaključkom, umjesto da se govornik oslanja isključivo na improvizaciju.

## Kako savladati tremu?

Trema je potpuno normalna, čak i kod iskusnih govornika. Nekoliko tehnika može pomoći: duboko disanje prije nastupa, vježbanje govora naglas kod kuće, i fokusiranje na poruku koja se prenosi umjesto na strah od ocjenjivanja.

## Govor tijela i ton glasa

Način na koji nešto kažemo često je jednako važan kao i sam sadržaj. Održavanje kontakta očima, uspravno držanje i variranje tona glasa čine izlaganje dinamičnijim i lakšim za praćenje.

## Vježba čini majstora

Kao i svaka druga vještina, javni govor se poboljšava isključivo kroz praksu. Svaki novi nastup, čak i pred manjom grupom ljudi, gradi samopouzdanje i postepeno smanjuje strah od javnog nastupa.`,
  },
  {
    slug: 'kako-izgraditi-licni-brend',
    title: 'Kako izgraditi lični brend online',
    category: 'Poslovanje',
    excerpt:
      'Lični brend nije rezervisan samo za influensere. Saznajte kako izgraditi prepoznatljivo online prisustvo koje otvara poslovne prilike.',
    publishedAt: '2026-08-12',
    image: {
      src: '/images/blog/licni-brend.jpg',
      alt: 'Osoba koristi laptop za rad na društvenim mrežama',
    },
    content: `## Šta je lični brend?

Lični brend predstavlja način na koji vas drugi doživljavaju na osnovu onoga što dijelite, kako komunicirate i koje vrijednosti predstavljate – online i van interneta. Ne odnosi se samo na poznate ličnosti, već na svakoga ko želi da izgradi profesionalnu reputaciju.

## Zašto je lični brend bitan?

U svijetu gdje poslodavci i klijenti često prvo pogledaju nečiji online profil, dobro izgrađen lični brend može otvoriti vrata poslovnim prilikama, saradnjama i novim poznanstvima u struci.

## Prvi koraci u izgradnji brenda

- Definisati oblast u kojoj se želite pozicionirati kao stručnjak
- Izabrati platformu koja najviše odgovara toj oblasti (LinkedIn, Instagram, blog)
- Redovno dijeliti sadržaj koji donosi vrijednost drugima
- Biti dosljedan u tonu i temama kojima se bavite

## Autentičnost je ključna

Ljudi prepoznaju kada je nešto neiskreno. Najjači lični brendovi su oni koji odražavaju stvarne vrijednosti i znanje osobe, a ne pokušaj da se oponaša neko drugi.

## Strpljenje i dosljednost

Izgradnja ličnog brenda nije proces koji se dešava preko noći. Potrebno je vrijeme, redovno objavljivanje i strpljenje – ali dugoročno, ovo je jedna od najvrednijih investicija u sopstvenu karijeru.`,
  },
  {
    slug: 'freelancing-101-kako-poceti',
    title: 'Freelancing 101: kako početi',
    category: 'Poslovanje',
    excerpt:
      'Sve što trebate znati za početak freelance karijere – od izbora niše i platformi do prvih klijenata i postavljanja cijena.',
    publishedAt: '2026-08-18',
    image: {
      src: '/images/blog/freelancing.jpg',
      alt: 'Freelancer radi na laptopu u kafiću',
    },
    content: `## Šta je freelancing?

Freelancing podrazumijeva rad kao samostalni izvođač usluga, bez stalnog poslodavca. Freelanceri sami biraju klijente, projekte i raspored rada, što ovaj oblik zaposlenja čini privlačnim mnogima koji traže fleksibilnost.

## Izbor niše

Prvi korak je odabir oblasti u kojoj postoje vještine koje se mogu ponuditi tržištu – programiranje, dizajn, pisanje, prevođenje ili digitalni marketing su samo neki od popularnih pravaca. Fokusiranje na specifičnu nišu olakšava izgradnju reputacije.

## Gdje pronaći prve klijente?

Platforme poput Upwork-a, Fiverr-a i Freelancer.com omogućavaju povezivanje sa klijentima širom svijeta. Pored toga, lične preporuke i mreža kontakata često su najvredniji izvor prvih poslova.

## Kako odrediti cijenu usluga?

Početnicima se često preporučuje da istraže cijene na tržištu za sličan nivo iskustva, a zatim postave konkurentnu, ali fer cijenu. Vremenom, kako se gradi portfolio i reputacija, cijene se mogu postepeno povećavati.

## Organizacija i disciplina

Bez fiksnog radnog vremena, samodisciplina postaje ključna. Uspješni freelanceri obično imaju jasan raspored, vode evidenciju o projektima i rokovima, i redovno komuniciraju sa klijentima kako bi izgradili povjerenje i dugoročnu saradnju.`,
  },
  {
    slug: 'osnove-excela',
    title: 'Osnove Excela koje bi svako trebao znati',
    category: 'IT & tehnologija',
    excerpt:
      'Excel je jedan od najkorisnijih alata u poslovnom svijetu. Pregled osnovnih funkcija i formula koje olakšavaju svakodnevni rad sa podacima.',
    publishedAt: '2026-08-24',
    image: {
      src: '/images/blog/osnove-excela.jpg',
      alt: 'Tabela sa podacima otvorena u Excelu',
    },
    content: `## Zašto je Excel i dalje toliko popularan?

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

Bez obzira na industriju, poznavanje Excela olakšava svakodnevne zadatke – od vođenja budžeta do analize prodaje. To je vještina koja se traži na gotovo svakom radnom mjestu koje uključuje rad sa podacima, brojevima ili izvještajima.`,
  },
];

/**
 * Rough reading time from word count (200 wpm), used for the "X MIN"
 * badge. Not stored per post - computed on the fly so it never drifts
 * out of sync with edits to `content`.
 */
export function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Unique categories in use, for the filter pills - "Sve teme" is added by the UI */
export const BLOG_CATEGORIES = Array.from(
  new Set(BLOG_POSTS.map((post) => post.category).filter((c): c is string => Boolean(c))),
);

/** One post by slug, or undefined so the page can render its 404. */
export function findBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
