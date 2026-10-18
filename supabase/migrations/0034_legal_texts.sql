-- 0034_legal_texts.sql
--
-- First real content for the two legal documents seeded empty by 0030.
--
-- ## Why a migration, when these are edited in the admin UI
--
-- They are still edited at `/admin/settings/legal` — that is the point of
-- keeping them in the database. This only gives every database the same
-- starting text, so a fresh production project launches with terms and a
-- privacy policy rather than two "not written yet" notices, and the first
-- version is reviewable in git. After this, the admin screen owns them.
--
-- Hence `and content = ''`: the update only fills a document nobody has
-- written yet. Without it, pushing this to a database where an admin had
-- already edited the text would silently replace their version. (The
-- development database got the same text written directly, because its
-- privacy policy already held an earlier draft.)
--
-- ## What the text has to stay true to
--
-- Both documents describe how the platform actually behaves (PROJECT-CONTEXT
-- §7): payment by bank transfer outside the system, access approved by an
-- admin, sequential modules, certificates issued on completing every module,
-- the private certificate page plus the number-and-surname public check, PDF
-- materials read in-app, YouTube video, Supabase/Vercel/Resend as processors.
-- If one of those changes, these texts need changing too.
--
-- Written in Bosnian (ijekavian), addressing the reader as "ti" like the rest
-- of the public pages. The provider's details must match `SITE.company` in
-- `src/lib/siteConfig.ts`, which prints them in the footer.

update public.legal_documents
set content = btrim($privacy$
Ova politika privatnosti objašnjava kako platforma Edubox Žepče (u daljnjem tekstu: „Platforma”), dostupna na adresi [www.edubox-zepce.ba](https://www.edubox-zepce.ba), prikuplja, koristi i štiti tvoje lične podatke.

## 1. Kontrolor podataka

Kontrolor tvojih ličnih podataka je:

**Razvojna agencija Žepče**\
Ulica Prva bb, 72230 Žepče, Bosna i Hercegovina\
ID broj: 4218693330009\
Email: [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba)

## 2. Koje podatke prikupljamo

### a) Podaci o nalogu

Kada otvoriš nalog putem emaila i lozinke, čuvamo:

- ime i prezime,
- email adresu,
- lozinku, isključivo u zaštićenom (hashiranom) obliku — tvoju lozinku ne možemo pročitati,
- datum i vrijeme kada si prihvatio/la uvjete korištenja i ovu politiku privatnosti.

### b) Podaci pri prijavi putem Google naloga

Kada se prijaviš ili registruješ opcijom „Prijavi se sa Google nalogom” odnosno „Registruj se sa Google nalogom”, od Google-a dobijamo isključivo:

- ime i prezime,
- email adresu,
- profilnu fotografiju (ako postoji).

Tvoju Google lozinku ne dobijamo niti je čuvamo.

### c) Podaci o zahtjevima za pristup kursu

- zahtjevi za pristup kursu i njihov status,
- poziv na broj koji navodiš prilikom uplate.

Uplata se vrši bankovnim transferom, izvan Platforme. Ne prikupljamo i ne čuvamo podatke o platnim karticama niti pristupne podatke za internet bankarstvo.

### d) Podaci o učenju

- kursevi kojima imaš pristup i tvoj napredak kroz module,
- rezultati kvizova,
- predani zadaci, priložene datoteke i poruke razmijenjene s predavačem,
- izdati certifikati (broj certifikata, ime i prezime, naziv kursa i datum izdavanja),
- zahtjevi za slanje štampanog certifikata i adresa za dostavu, ako nam je pošalješ.

### e) Komunikacija i postavke

- zahtjevi za podršku i poruke u njima,
- poruke poslane putem kontakt forme (ime i prezime, email adresa, tema i sadržaj poruke),
- tvoje postavke: obavještenja, prijava na newsletter i izabrana tema prikaza.

### f) Tehnički podaci

IP adresa, tip preglednika i uređaja te vrijeme pristupa, u svrhu sigurnosti i ispravnog rada Platforme — na primjer, radi zaštite provjere certifikata od zloupotrebe.

## 3. Svrha i pravni osnov obrade

Tvoje podatke koristimo isključivo za:

- otvaranje i upravljanje tvojim korisničkim nalogom,
- obradu zahtjeva za pristup kursu i povezivanje uplate s tvojim zahtjevom,
- omogućavanje pristupa kursevima i edukativnim materijalima,
- praćenje napretka, pregled zadataka i izdavanje certifikata,
- slanje obavještenja vezanih za kurseve kojima imaš pristup,
- odgovaranje na upite i zahtjeve za podršku,
- slanje newslettera, ako si se na njega prijavio/la,
- održavanje sigurnosti i ispravnog funkcionisanja Platforme.

Pravni osnov za obradu je:

- **izvršavanje ugovora** — podaci bez kojih ti ne možemo pružiti uslugu (nalog, kursevi, certifikati, podrška),
- **saglasnost** — za newsletter; saglasnost možeš povući u svakom trenutku u postavkama naloga,
- **legitimni interes** — sigurnost Platforme i sprječavanje zloupotrebe,
- **zakonska obaveza** — podaci koje smo dužni čuvati prema računovodstvenim i poreznim propisima.

## 4. Korištenje podataka dobijenih od Google-a

Podaci dobijeni putem Google prijave koriste se isključivo za tvoju identifikaciju i prijavu na Platformu. Ovi podaci se ne prodaju, ne iznajmljuju, ne koriste u reklamne svrhe i ne dijele s trećim stranama, osim kada je to neophodno za rad Platforme ili zakonski obavezno. Korištenje ovih podataka u skladu je s [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), uključujući zahtjeve ograničene upotrebe (Limited Use).

## 5. Ko vidi tvoje podatke

Tvoje podatke ne prodajemo niti ustupamo trećim stranama u komercijalne svrhe.

**Unutar Platforme** tvoje podatke vide samo oni kojima su potrebni za rad:

- administratori Platforme,
- predavač kursa kojem si poslao/la zahtjev za pristup — za taj kurs vidi tvoje ime, zahtjev, napredak, predane zadatke, poruke i certifikat.

**Provjera certifikata.** Ko zna broj tvog certifikata i tvoje prezime može na stranici [Provjera certifikata](/provjera-certifikata) potvrditi da je certifikat važeći i vidjeti tvoje ime i prezime, naziv kursa i datum izdavanja. Bez oba podatka provjera ne otkriva ništa. Link za provjeru dijeliš ti, ako to želiš — na primjer, uz svoj CV.

**Izvan Platforme** podaci su dostupni samo:

- pružaocima tehničkih usluga koji rade u naše ime i obavezani su na povjerljivost:
  - **Supabase** — baza podataka, prijava korisnika i pohrana datoteka,
  - **Vercel** — hosting Platforme,
  - **Resend** — slanje emailova,
  - **Google** — prijava putem Google naloga, ako je koristiš, i prikaz videozapisa putem YouTube-a,
- nadležnim organima, kada to zahtijeva zakon.

Neki od ovih pružalaca podatke obrađuju izvan Bosne i Hercegovine, u Europskoj uniji ili Sjedinjenim Američkim Državama. Takav prijenos vršimo samo uz zaštitne mjere koje propisuje zakon.

## 6. Čuvanje podataka

Podatke čuvamo dok je tvoj nalog aktivan ili dok je to potrebno za svrhe navedene u ovoj politici. Nalog ne možeš obrisati sam/a: brisanje zatraži emailom na [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba). Nakon brisanja naloga tvoji lični podaci se brišu u roku od 30 dana, osim onih koje smo po zakonu dužni čuvati duže.

Poruke poslane putem kontakt forme čuvamo dok je to potrebno da bismo odgovorili na upit.

## 7. Kolačići i lokalna pohrana

Platforma koristi:

- neophodne kolačiće za održavanje tvoje prijave (sesije) i ispravan rad stranice,
- lokalnu pohranu preglednika (localStorage) za pamćenje izabrane teme prikaza.

Ne koristimo kolačiće za reklamiranje niti za praćenje.

Videozapisi u kursevima prikazuju se putem YouTube-a, u režimu proširene privatnosti (youtube-nocookie.com). Kada pokreneš video, YouTube može na tvom uređaju sačuvati podatke i obraditi tvoju IP adresu, u skladu sa [svojom politikom privatnosti](https://policies.google.com/privacy).

## 8. Sigurnost

Primjenjujemo odgovarajuće tehničke i organizacione mjere zaštite, uključujući šifriranu vezu (HTTPS), čuvanje lozinki isključivo u hashiranom obliku i ograničen pristup podacima, kako bismo zaštitili tvoje podatke od neovlaštenog pristupa, gubitka ili zloupotrebe.

## 9. Tvoja prava

U skladu sa Zakonom o zaštiti ličnih podataka Bosne i Hercegovine, imaš pravo da:

- zatražiš uvid u lične podatke koje čuvamo o tebi,
- zatražiš ispravak netačnih podataka,
- zatražiš brisanje svojih podataka i naloga,
- povučeš saglasnost za obradu podataka, na primjer odjavom s newslettera,
- uložiš prigovor na obradu koja se zasniva na legitimnom interesu.

Zahtjev možeš poslati na [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba). Odgovorit ćemo u roku od 30 dana.

Također imaš pravo podnijeti prigovor Agenciji za zaštitu ličnih/osobnih podataka u Bosni i Hercegovini ([www.azlp.ba](https://www.azlp.ba)).

## 10. Opoziv pristupa Google nalogu

Pristup Platforme tvom Google nalogu možeš u svakom trenutku ukinuti na stranici [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

## 11. Izmjene politike privatnosti

Ovu politiku možemo povremeno ažurirati. Sve izmjene bit će objavljene na ovoj stranici, uz navođenje datuma posljednjeg ažuriranja.

## 12. Kontakt

Za sva pitanja u vezi s privatnošću piši nam na [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba).
$privacy$, E'\n')
where slug = 'privacy' and content = '';

update public.legal_documents
set content = btrim($terms$
Ovi uvjeti korištenja (u daljnjem tekstu: „Uvjeti”) uređuju korištenje platforme Edubox Žepče (u daljnjem tekstu: „Platforma”), dostupne na adresi [www.edubox-zepce.ba](https://www.edubox-zepce.ba).

Otvaranjem naloga potvrđuješ da si pročitao/la i prihvatio/la ove Uvjete i [Politiku privatnosti](/politika-privatnosti). Ako se s njima ne slažeš, nemoj otvarati nalog niti slati zahtjeve za pristup kursevima.

## 1. Pružalac usluge

Platformom upravlja:

**Razvojna agencija Žepče**\
Ulica Prva bb, 72230 Žepče, Bosna i Hercegovina\
ID broj: 4218693330009\
Email: [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba)

## 2. Pojmovi

- **Korisnik** — svako ko je otvorio nalog na Platformi.
- **Kurs** — online program koji se sastoji od jednog ili više modula.
- **Modul** — dio kursa koji može sadržavati videozapis, materijale, kviz i praktični zadatak.
- **Predavač** — osoba koja je pripremila kurs i pregleda predane zadatke.
- **Certifikat** — potvrda o završetku kursa koju Platforma izdaje u elektronskom obliku.

## 3. Nalog

- Pregled kurseva je javan. Nalog ti je potreban da bi poslao/la zahtjev za pristup kursu i učio/la na Platformi.
- Nalog otvaraš emailom i lozinkom ili putem Google naloga. Podaci koje uneseš moraju biti tačni.
- **Ime i prezime iz naloga ispisuju se na certifikatu**, zato ih unesi onako kako želiš da pišu. Ako ih trebaš ispraviti, javi nam se.
- Nalog je lični. Ne smiješ ga dijeliti s drugima, a za čuvanje lozinke odgovoran/na si ti.
- Ako si mlađi/a od 18 godina, Platformu možeš koristiti samo uz saglasnost roditelja ili staratelja.

## 4. Pristup kursu i plaćanje

1. Na stranici kursa šalješ zahtjev za pristup.
2. Nakon zahtjeva dobijaš **poziv na broj** (npr. UPL-2026-0001) i podatke za uplatu.
3. Uplatu vršiš bankovnim transferom, uz obavezno navođenje poziva na broj — po njemu prepoznajemo tvoju uplatu.
4. Kada uplata stigne, administrator odobrava pristup i o tome te obavještavamo. Do odobrenja sadržaj kursa nije dostupan.

Cijene su iskazane u konvertibilnim markama (KM), uključuju PDV ako se obračunava, i važe u trenutku slanja zahtjeva. Za besplatne kurseve uplata nije potrebna, a pristup također odobrava administrator.

Zahtjev može biti odbijen, na primjer ako uplata nije stigla ili ne odgovara cijeni kursa. Odbijeni zahtjev možeš poslati ponovo; novi zahtjev dobija novi poziv na broj.

## 5. Povrat uplate

- Ako uplatiš, a pristup kursu ne odobrimo, vraćamo ti cijeli iznos.
- Povrat uplate možeš zatražiti u roku od 14 dana od odobrenja pristupa, pod uvjetom da nisi završio/la nijedan modul kursa.
- Zahtjev za povrat šalješ na [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba), uz poziv na broj. Novac vraćamo na račun s kojeg je uplata izvršena, u roku od 14 dana od prihvatanja zahtjeva, a pristup kursu se tada ukida.

## 6. Učenje na Platformi

- Pristup odobrenom kursu je vremenski neograničen, dok god Platforma radi i kurs je objavljen.
- Moduli se otključavaju redom. Modul je završen kada uspješno riješiš njegov kviz i kada predavač prihvati tvoj zadatak; modul bez kviza i zadatka završavaš sam/a, kada prođeš kroz njegov sadržaj.
- Zadatke predaješ kroz Platformu. Predavač ih pregleda i može ih prihvatiti ili tražiti izmjenu; prihvaćen zadatak je konačan.
- Materijali u PDF formatu čitaju se unutar Platforme. Datoteke priložene uz zadatak možeš preuzeti radi izrade zadatka.
- Videozapisi se prikazuju putem YouTube-a.
- Sadržaj kursa možemo ažurirati i dopunjavati. Već završeni moduli ostaju završeni.

## 7. Certifikat

- Certifikat se izdaje automatski kada završiš sve module kursa.
- Na certifikatu su tvoje ime i prezime, naziv kursa, datum izdavanja i jedinstveni broj certifikata.
- Stranicu certifikata vidiš ti, administratori Platforme i predavač kursa. Bilo ko drugi može provjeriti certifikat na stranici [Provjera certifikata](/provjera-certifikata), ali samo ako zna i broj certifikata i tvoje prezime.
- Možeš zatražiti i štampani primjerak certifikata; javit ćemo ti se radi dostave.
- Certifikat potvrđuje da si završio/la online kurs na Platformi. Nije javna isprava niti diploma akreditovane obrazovne ustanove.

## 8. Pravila ponašanja

Na Platformi nije dozvoljeno:

- dijeliti nalog ili pristup kursu s drugim osobama,
- umnožavati, objavljivati ili dalje distribuirati sadržaj kurseva (videozapise, materijale, kvizove),
- predavati tuđi rad kao svoj,
- postavljati zlonamjerne, nezakonite ili uvredljive sadržaje, uključujući priloge uz zadatke i poruke,
- vrijeđati ili uznemiravati predavače, administratore i druge korisnike,
- pokušavati neovlašteno pristupiti dijelovima Platforme ili tuđim podacima.

Ako prekršiš ova pravila, možemo deaktivirati tvoj nalog.

## 9. Intelektualno vlasništvo

Sadržaj kurseva pripada nama ili predavačima i zaštićen je autorskim pravom. Odobrenjem pristupa dobijaš lično, neprenosivo pravo da sadržaj koristiš za vlastito učenje.

Zadaci koje predaš ostaju tvoji. Dozvoljavaš nam da ih čuvamo i prikažemo predavaču i administratorima radi pregleda.

## 10. Obavještenja i newsletter

O važnim događajima — odobrenom pristupu, pregledanom zadatku, izdatom certifikatu — obavještavamo te na Platformi i emailom. Koja obavještenja primaš biraš u postavkama naloga.

Newsletter primaš samo ako se na njega prijaviš, a odjaviti se možeš u svakom trenutku.

## 11. Podrška

Pitanja i probleme možeš nam poslati kao zahtjev za podršku unutar Platforme ili emailom na [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba).

## 12. Dostupnost i odgovornost

Trudimo se da Platforma radi bez prekida, ali ne možemo garantovati da će uvijek biti dostupna i bez grešaka; povremeno može biti nedostupna zbog održavanja ili tehničkih problema.

U mjeri u kojoj to zakon dozvoljava, ne odgovaramo za posrednu štetu nastalu korištenjem Platforme. Ništa u ovim Uvjetima ne ograničava prava koja ti kao potrošaču pripadaju po zakonu.

## 13. Deaktivacija i brisanje naloga

- Brisanje naloga možeš zatražiti u svakom trenutku emailom na [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba). Brisanjem gubiš pristup kursevima i certifikatima.
- Nalog možemo deaktivirati ako prekršiš ove Uvjete. Deaktivacija ne briše tvoje podatke, a ponovnom aktivacijom pristup se vraća.

## 14. Izmjene Uvjeta

Ove Uvjete možemo povremeno mijenjati. Izmjene objavljujemo na ovoj stranici, uz datum posljednjeg ažuriranja. Nastavkom korištenja Platforme nakon izmjena prihvataš izmijenjene Uvjete.

## 15. Mjerodavno pravo i sporovi

Na ove Uvjete primjenjuje se pravo Bosne i Hercegovine. Sporove nastojimo riješiti dogovorom; ako to ne uspije, nadležan je sud prema sjedištu pružaoca usluge, osim ako zakon o zaštiti potrošača ne propisuje drugačije.

## 16. Kontakt

Za sva pitanja u vezi s ovim Uvjetima piši nam na [info@edubox-zepce.ba](mailto:info@edubox-zepce.ba).
$terms$, E'\n')
where slug = 'terms' and content = '';
