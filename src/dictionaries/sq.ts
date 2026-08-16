import type { Lang } from "@/lib/i18n";

/**
 * Albanian UI strings — the canonical dictionary shape. `en.ts` must satisfy
 * `Dictionary` (= typeof sq), so adding a key here forces a translation.
 * Product and category names come from the catalog data and stay original.
 */
export const sq = {
  lang: "sq" as Lang,

  site: {
    tagline: "Distributor me shumicë i pajisjeve dhe produkteve mjekësore",
    titleDefault: "SHEMO PHARM | Produkte dhe pajisje mjekësore në Kosovë",
    description:
      "SHEMO PHARM është depo farmaceutike dhe distributor me shumicë i produkteve, pajisjeve mjekësore, produkteve ortopedike, suplementeve dhe artikujve të kujdesit personal në Kosovë.",
  },

  common: {
    skipToContent: "Kalo te përmbajtja",
    viewAll: "Shiko të gjitha",
    viewProducts: "Shiko produktet",
    browseProducts: "Shfleto produktet",
    productsSuffix: "produkte",
    loading: "Duke ngarkuar…",
    optional: "(opsionale)",
    honeypotLabel: "Mos e plotësoni këtë fushë",
    piece: "copë",
    code: "Kodi",
  },

  nav: {
    home: "Ballina",
    products: "Produktet",
    categories: "Kategoritë",
    brands: "Markat",
    offers: "Oferta",
    about: "Rreth nesh",
    contact: "Kontakti",
    account: "Llogaria",
    wishlist: "Të preferuarat",
    cart: "Shporta",
    catalog: "Katalogu",
    mainLabel: "Navigimi kryesor",
    menuLabel: "Menyja",
    openMenu: "Hap menynë",
    closeMenu: "Mbyll menynë",
    quickLinks: "Linqe të shpejta",
    allCategories: "Shiko të gjitha kategoritë",
    loginRegister: "Kyçu / Regjistrohu",
    accountWithName: "Llogaria ({name})",
    homeAria: "SHEMO PHARM — Ballina",
    langLabel: "Gjuha",
  },

  header: {
    trust: [
      "Distributor i licencuar nga MSh e Kosovës",
      "Furnizim në gjithë Kosovën",
    ],
    requestQuote: "Kërko ofertë",
    partnerLogin: "Hyrja për partnerë",
    searchOpen: "Kërko produkte",
    megaPromoTitle: "Oferta të veçanta",
    megaPromoText: "Çmime të veçanta për barnatore dhe partnerë biznesi.",
    megaPromoCta: "Shiko ofertat",
  },

  search: {
    label: "Kërko produkte",
    placeholder: "Kërko produkte, marka, kategori…",
    button: "Kërko",
    clear: "Pastro kërkimin",
    suggestionsLabel: "Sugjerime kërkimi",
    noResults: "Asnjë produkt nuk u gjet për “{q}”",
    viewAllResults: "Shiko të gjitha rezultatet ({total})",
  },

  hero: {
    eyebrow: "Distributor i licencuar farmaceutik në Kosovë",
    h1a: "Furnizim farmaceutik",
    h1b: "që i beson Kosova.",
    sub: "Mbi 3,000 produkte dhe furnizim profesional për barnatore, institucione dhe partnerë shëndetësorë në gjithë Kosovën.",
    ctaProducts: "Shiko produktet",
    ctaContact: "Na kontaktoni",
    trustLicensed: "Distributor i licencuar",
    trustProducts: "3000+ produkte",
    trustSupply: "Furnizim në gjithë Kosovën",
    badge: "I licencuar nga MSh e Kosovës",
    imageAlt:
      "Farmacistja e SHEMO Pharm duke këshilluar një nënë dhe vajzën e saj në barnatore",
    depotAlt: "Depoja e SHEMO PHARM në Prizren",
  },

  stats: {
    label: "Shifrat e kompanisë",
    labels: ["Klientë", "Produkte", "Brende partnere", "Barnatore", "Depo"],
  },

  home: {
    categoriesEyebrow: "Katalogu ynë",
    categoriesTitle: "Kategoritë kryesore",
    categoriesSub:
      "Zgjidhni sipas kategorisë dhe gjeni shpejt produktet që ju nevojiten.",
    /** Blurbs only — the card title is the category's own display name. */
    categoryCards: {
      barnat: "Produkte farmaceutike nga brende të njohura",
      suplemente: "Vitamina, minerale dhe suplemente ushqimore",
      kozmetike: "Produkte për kujdesin e lëkurës dhe higjienën",
      ortopedi: "Mbështetëse, banda dhe zgjidhje ortopedike",
      "paisje-medicinale": "Aparate matëse dhe pajisje për përdorim profesional",
      "alkool-dhe-antiseptik": "Dezinfektues dhe produkte antiseptike",
      fasha: "Fasho, fllastera dhe materiale për plagë",
      vajra: "Vajra natyrale dhe çajra mjekësore",
    },
    featuredEyebrow: "Të zgjedhura për ju",
    featuredTitle: "Produktet e veçuara",
    featuredSubtitle: "Një përzgjedhje nga katalogu ynë",
    featuredCta: "Shiko katalogun me 3,000+ produkte",
    whyEyebrow: "Pse SHEMO Pharm",
    whyTitle: "Pse partnerët na besojnë neve?",
    whySub:
      "Shërbim për barnatore, institucione dhe profesionistë shëndetësorë — me katalog të gjerë, furnizim të qëndrueshëm dhe këshillim profesional.",
    whyItems: [
      {
        title: "Distributor i licencuar",
        text: "I licencuar nga Agjencia për Produkte dhe Pajisje Mjekësore, Ministria e Shëndetësisë e Kosovës.",
      },
      {
        title: "Katalog i gjerë",
        text: "Gamë e plotë produktesh farmaceutike, medicinale dhe të kujdesit personal në një vend.",
      },
      {
        title: "Brende të njohura",
        text: "Bashkëpunime me brende të njohura ndërkombëtare dhe vendore.",
      },
      {
        title: "Këshillim profesional",
        text: "Ekipi ynë ju ndihmon të zgjidhni produktet e duhura për ju.",
      },
      {
        title: "Furnizim i qëndrueshëm",
        text: "Dërgesa të besueshme dhe në kohë në gjithë Kosovën.",
      },
      {
        title: "Rrjet fizik",
        text: "Barnatore dhe depo për qasje të shpejtë dhe stok të sigurt në gjithë Kosovën.",
      },
    ],
    networkEyebrow: "Rrjeti ynë",
    networkTitle: "Rrjet i besueshëm për furnizim dhe shpërndarje",
    networkSub:
      "Me 12 barnatore dhe 2 depo, SHEMO Pharm ofron furnizim të qëndrueshëm, qasje të shpejtë në produkte dhe mbështetje profesionale për klientë në gjithë Kosovën.",
    networkPharmacies: "Barnatore",
    networkDepots: "Depo",
    networkPoints: [
      "Mbulim në gjithë Kosovën me dërgesa të shpejta dhe të besueshme",
      "Ruajtje dhe menaxhim profesional i produkteve mjekësore",
      "Furnizim i qëndrueshëm për barnatore, institucione dhe profesionistë",
    ],
    networkImageAlt: "Depoja dhe qendra e distribuimit",
    networkImageAlt2: "Një nga barnatoret tona",
    adviceEyebrow: "Këshillim profesional",
    adviceTitle1: "Këshillim profesional",
    adviceTitle2: "kurdo që keni nevojë.",
    adviceSub: "Ekipi ynë ju ndihmon të gjeni produktet dhe zgjidhjet më të përshtatshme për barnatoren, institucionin ose familjen tuaj.",
    adviceWhatsapp: "Bisedo në WhatsApp",
    adviceServices: [
      "Rekomandime produktesh sipas nevojës suaj",
      "Informacion mbi disponueshmërinë dhe stokun",
      "Porosi me shumicë për barnatore dhe institucione",
    ],
    adviceImageAlt:
      "Dy farmacistë të SHEMO Pharm duke shqyrtuar një porosi në laptop pas banakut",
    hoursTitle: "Orari i punës",
    hoursDays: "E hënë – E premte",
    hoursTime: "09:00 – 18:00",
    brandsEyebrow: "Partnerët tanë",
    brandsTitle: "Brendet që distribuojmë",
    brandsSub: "Bashkëpunojmë me brende të njohura ndërkombëtare",
    brandsCta: "Shiko të gjitha brendet",
  },

  cta: {
    title: "Keni nevojë për ndihmë në zgjedhjen e produkteve?",
    sub: "Kontaktoni ekipin tonë për informacione rreth produkteve, disponueshmërisë dhe bashkëpunimit.",
    whatsapp: "Na shkruani në WhatsApp",
    contact: "Kontakti",
  },

  footer: {
    blurb:
      "SHEMO PHARM furnizon barnatore dhe partnerë profesionalë në Kosovë me produkte mjekësore, ortopedike, suplemente dhe artikuj të kujdesit personal nga brende të njohura ndërkombëtare.",
    categories: "Kategoritë",
    contactTitle: "Na kontaktoni",
    facebookAria: "SHEMO PHARM në Facebook",
    instagramAria: "SHEMO PHARM në Instagram",
    legalNav: "Informacione ligjore",
    rights: "© {year} SHEMO PHARM. Të gjitha të drejtat e rezervuara.",
    licensed:
      "Licencuar nga Agjencia për Produkte dhe Pajisje Mjekësore, Ministria e Shëndetësisë e Kosovës",
  },

  /**
   * Privacy policy and terms of use.
   *
   * Written from what the code actually does, not from a template: one
   * strictly-necessary session cookie, two localStorage keys holding product
   * ids, form data in Neon, images on Vercel Blob, mail through Resend, IP
   * addresses stored only as a salted hash for rate limiting, and WhatsApp as
   * an order channel. There is no analytics dependency and no third-party
   * script — `connect-src 'self'` in the CSP would block one — which is why
   * there is no consent banner and the policy says so instead of implying one
   * was forgotten.
   *
   * `draftNotice` stays on the page until a lawyer has signed the text off.
   * Remove it in both dictionaries at the same time.
   */
  legal: {
    draftNotice:
      "Ky tekst është një draft i përgatitur sipas funksionimit teknik të faqes dhe nuk është ende i rishikuar juridikisht. Para publikimit përfundimtar duhet miratuar nga një jurist.",
    lastUpdatedLabel: "Përditësuar më",
    lastUpdated: "12 gusht 2026",

    /**
     * Shown under the contact and registration forms. A sentence with a link,
     * not a tick box: the processing rests on preparing a business
     * relationship, and a forced checkbox would swap that for consent — the
     * weaker basis, revocable at any moment, for data we need in order to
     * answer at all.
     */
    formNotice: "Të dhënat që dërgoni i përdorim vetëm për t'ju kontaktuar. Lexoni {link}.",
    formNoticeLink: "politikën e privatësisë",

    privacy: {
      title: "Politika e privatësisë",
      metaDescription:
        "Si i mbledh, i përdor dhe i ruan SHEMO PHARM të dhënat personale të vizitorëve dhe partnerëve — cookies, formularët, porositë dhe të drejtat tuaja.",
      intro:
        "Kjo faqe shpjegon cilat të dhëna personale mbledhim kur përdorni shemo-pharm, pse i mbledhim dhe çfarë mund të kërkoni nga ne. E kemi mbajtur të shkurtër, sepse faqja mbledh pak.",
      sections: [
        {
          heading: "Kush është përgjegjës",
          body: [
            "Përgjegjës për përpunimin e të dhënave është SHEMO PHARM, Rr. Ernest Koliqi 165/A, 20000 Prizren, Kosovë.",
            "Për çdo pyetje lidhur me të dhënat tuaja mund të shkruani në info@shemopharm.com ose të telefononi në +383 (0) 49 600 934.",
          ],
        },
        {
          heading: "Çfarë mbledhim dhe kur",
          body: [
            "Formulari i kontaktit: emrin, firmën, numrin e telefonit, adresën e email-it, subjektin dhe mesazhin që shkruani. Këto ruhen që t'ju përgjigjemi dhe që kërkesa të mos humbasë.",
            "Regjistrimi për partnerë: emrin, firmën, telefonin, email-in dhe një fjalëkalim. Fjalëkalimi nuk ruhet kurrë ashtu siç e shkruani — ruhet vetëm një vlerë e llogaritur prej tij, nga e cila fjalëkalimi nuk mund të rikthehet.",
            "Porositë: produktet dhe sasitë që vendosni në shportë, kanali që zgjidhni (WhatsApp ose email) dhe, nëse jeni të kyçur, emri dhe email-i i llogarisë suaj.",
            "Nuk mbledhim të dhëna shëndetësore dhe nuk ju kërkojmë kurrë të dhëna që nuk janë të nevojshme për bashkëpunimin tregtar.",
          ],
        },
        {
          heading: "Baza ligjore",
          body: [
            "Të dhënat e formularit të kontaktit dhe të regjistrimit i përpunojmë për të përgatitur ose zbatuar një marrëdhënie tregtare me ju ose me firmën tuaj.",
            "Të dhënat teknike minimale — të përshkruara më poshtë — i përpunojmë për interesin tonë legjitim që faqja të mbetet funksionale dhe e mbrojtur nga keqpërdorimi.",
          ],
        },
        {
          heading: "Cookies dhe ruajtja në shfletues",
          body: [
            "Përdorim një cookie të vetme, shemo_session. Ajo krijohet vetëm kur kyçeni, mban sesionin tuaj shtatë ditë (një ditë për llogaritë e administrimit) dhe nuk lexohet dot nga skriptet në faqe. Pa të nuk mund të kyçeni — prandaj është teknikisht e domosdoshme.",
            "Shporta dhe lista e dëshirave ruhen në shfletuesin tuaj, nën shemo-cart dhe shemo-wishlist. Ato përmbajnë vetëm numra identifikues produktesh dhe sasi, nuk përmbajnë asnjë të dhënë personale dhe nuk dërgohen askund derisa ju vetë të dërgoni porosinë.",
            "Nuk përdorim asnjë mjet analitik, asnjë piksel reklamimi dhe asnjë skript të palëve të treta. Për këtë arsye kjo faqe nuk shfaq banderolë pëlqimi për cookies: nuk ka çfarë të pëlqeni.",
          ],
        },
        {
          heading: "Kush i përpunon të dhënat për ne",
          body: [
            "Faqja strehohet te Vercel, baza e të dhënave te Neon dhe fotografitë te Vercel Blob. Email-et transaksionale — verifikimi i adresës dhe rikthimi i fjalëkalimit — dërgohen përmes Resend.",
            "Kur dërgoni porosinë përmes WhatsApp, teksti i porosisë kalon përmes WhatsApp dhe i nënshtrohet kushteve të Meta. Nëse preferoni ta shmangni këtë, përdorni email-in ose telefonin.",
          ],
        },
        {
          heading: "Adresat IP",
          body: [
            "Për të penguar keqpërdorimin e formularëve dhe të kyçjes, numërojmë kërkesat për çdo vizitor. Adresa juaj IP nuk ruhet e plotë: ruhet vetëm një vlerë e koduar prej saj, e cila nuk mund të kthehet mbrapsht në një adresë dhe nuk identifikon askënd.",
          ],
        },
        {
          heading: "Sa gjatë i ruajmë",
          body: [
            "Mesazhet e kontaktit dhe porositë ruhen për aq kohë sa janë të nevojshme për marrëdhënien tregtare dhe për detyrimet ligjore të ruajtjes së dokumentacionit.",
            "Llogaritë e partnerëve ruhen derisa të kërkoni fshirjen e llogarisë.",
          ],
        },
        {
          heading: "Të drejtat tuaja",
          body: [
            "Keni të drejtë të kërkoni qasje në të dhënat tuaja, korrigjimin e tyre, fshirjen, kufizimin e përpunimit, si dhe të kundërshtoni përpunimin.",
            "Për ta ushtruar këtë të drejtë, na shkruani në info@shemopharm.com. Ju përgjigjemi brenda afateve që parashikon legjislacioni për mbrojtjen e të dhënave personale.",
            "Nëse mendoni se të dhënat tuaja nuk janë përpunuar si duhet, keni të drejtë të ankoheni te Agjencia për Informim dhe Privatësi e Republikës së Kosovës.",
          ],
        },
        {
          heading: "Ndryshimet e kësaj politike",
          body: [
            "Nëse ndryshojmë mënyrën se si i përpunojmë të dhënat, e përditësojmë këtë faqe dhe datën më sipër.",
          ],
        },
      ],
    },

    terms: {
      title: "Kushtet e përdorimit",
      metaDescription:
        "Kushtet e përdorimit të faqes SHEMO PHARM — llogaritë për partnerë, çmimet me shumicë, porositë dhe informacioni për produktet.",
      intro:
        "Këto kushte vlejnë për përdorimin e kësaj faqeje. Duke e shfletuar faqen ose duke krijuar një llogari, pranoni t'i respektoni ato.",
      sections: [
        {
          heading: "Për kë është kjo faqe",
          body: [
            "SHEMO PHARM është depo farmaceutike dhe distributor me shumicë. Kjo faqe u drejtohet barnatoreve, institucioneve shëndetësore dhe partnerëve profesionalë — jo shitjes me pakicë ndaj konsumatorit fundor.",
          ],
        },
        {
          heading: "Llogaritë dhe çmimet",
          body: [
            "Regjistrimi është i hapur, por llogaria bëhet aktive vetëm pasi ekipi ynë e verifikon. Deri atëherë katalogu shfaqet i plotë, por pa çmime.",
            "Çmimet me shumicë janë të dukshme vetëm për llogari të aprovuara dhe janë të destinuara për përdorim tregtar. Jeni përgjegjës për ruajtjen e fjalëkalimit tuaj dhe për veprimet e kryera me llogarinë tuaj.",
          ],
        },
        {
          heading: "Çmimet dhe disponueshmëria",
          body: [
            "Çmimet dhe disponueshmëria janë orientuese dhe mund të ndryshojnë. Ato nuk përbëjnë ofertë detyruese.",
            "Të dhënat e produkteve i marrim nga furnitorët dhe përpiqemi t'i mbajmë të sakta, por gabimet dhe ndryshimet e paketimit nuk përjashtohen.",
          ],
        },
        {
          heading: "Porositë",
          body: [
            "Shporta në këtë faqe është një kërkesë për ofertë, jo një blerje. Kur e dërgoni përmes WhatsApp ose email-it, ne ju kthehemi me konfirmimin e disponueshmërisë dhe të çmimeve.",
            "Marrëveshja lidhet vetëm pas konfirmimit tonë. Deri atëherë nuk krijohet asnjë detyrim për asnjërën palë.",
          ],
        },
        {
          heading: "Informacioni për produktet",
          body: [
            "Përshkrimet në këtë faqe janë informacion tregtar dhe nuk janë këshillë mjekësore ose farmaceutike.",
            "Për çdo produkt vlen fletëudhëzuesi i prodhuesit. Për përdorimin, dozimin dhe kundërindikacionet konsultohuni me farmacistin ose mjekun.",
          ],
        },
        {
          heading: "Përmbajtja e faqes",
          body: [
            "Emri, logoja, tekstet dhe fotografitë e kësaj faqeje janë pronë e SHEMO PHARM ose e prodhuesve përkatës dhe nuk mund të përdoren pa leje.",
          ],
        },
        {
          heading: "Përgjegjësia",
          body: [
            "Përpiqemi që faqja të jetë e disponueshme dhe e saktë, por nuk garantojmë funksionim pa ndërprerje dhe nuk mbajmë përgjegjësi për dëme që rrjedhin nga mosdisponueshmëria e përkohshme ose nga gabime në të dhënat e produkteve.",
          ],
        },
        {
          heading: "Ligji i zbatueshëm",
          body: [
            "Për këto kushte zbatohet legjislacioni i Republikës së Kosovës.",
          ],
        },
      ],
    },
  },

  product: {
    codeLabel: "Kodi i produktit:",
    loginForPrice: "Kyçu për të parë çmimin",
    outOfStock: "Pa stok",
    inStock: "Në stok",
    availability: "Disponueshmëria:",
    wholesalePrice: "Çmimi me shumicë",
    pricesHidden: "Çmimet janë të dukshme vetëm për klientët e kyçur",
    loginToSeePrice: "Kyçu për të parë çmimin",
    orderHeading: "Porositni ose kërkoni informacion",
    orderWhatsapp: "Porosit përmes WhatsApp",
    callUs: "Na telefononi",
    email: "Email",
    infoNote:
      "Për informacion të detajuar mbi produktin, disponueshmërinë dhe kushtet e porosisë me shumicë, kontaktoni ekipin e SHEMO PHARM.",
    related: "Produkte të ngjashme",
    whatsappInterest: "Përshëndetje! Jam i interesuar për produktin: {name}",
    mailSubject: "Kërkesë për produktin: {name}",
    galleryLabel: "Imazhet e produktit",
    galleryImage: "Imazhi {i} nga {total}",
    addToCart: "Shto në shportë",
    addedToCart: "U shtua në shportë",
    addToCartAria: "Shto “{name}” në shportë",
    increaseQty: "Rrit sasinë",
    decreaseQty: "Zvogëlo sasinë",
    qtyLabel: "Sasia: {qty}",
    qtyInput: "Sasia",
    wishlistAdd: "Shto “{name}” në listën e dëshirave",
    wishlistRemove: "Hiq “{name}” nga lista e dëshirave",
    discountBadge: "-{pct}%",
  },

  catalog: {
    title: "Produktet",
    subtitle: "Katalogu i plotë i produkteve dhe pajisjeve mjekësore",
    metaDescription:
      "Shfletoni katalogun e plotë të SHEMO PHARM: pajisje mjekësore, produkte ortopedike, suplemente, kozmetikë dhe produkte të kujdesit personal.",
    breadcrumbLabel: "Vendndodhja",
    productsCount: "{n} produkte",
    filters: "Filtrat",
    closeFilters: "Mbyll filtrat",
    activeFilters: "Filtrat aktivë",
    filterByCategory: "Filtro sipas kategorisë",
    /** Brand shelves narrow by product type instead of by category. */
    filterByType: "Filtro sipas llojit të produktit",
    typesHeading: "Llojet e produkteve",
    /** Heads the same panel for a brand that sells a single kind of thing,
     *  where there are no types under it to list. */
    brandHeading: "Marka",
    allOfBrand: "Të gjitha të kësaj marke",
    typeChip: "Lloji: {name}",
    allProducts: "Të gjitha produktet",
    categoriesHeading: "Kategoritë",
    searchInResults: "Kërko në këto produkte…",
    searchSubmit: "Kërko",
    searchClear: "Pastro kërkimin",
    searching: "Duke kërkuar…",
    searchChip: "Kërkimi: “{q}”",
    categoryChip: "Kategoria: {name}",
    inStockOnly: "Vetëm në stok",
    inStockChip: "Vetëm në stok",
    removeFilter: "— hiq filtrin",
    clearFilters: "Pastro filtrat",
    emptyTitle: "Asnjë produkt nuk u gjet",
    emptyTextQuery:
      "Nuk gjetëm produkte për \"{q}\". Provoni një term tjetër ose kontrolloni drejtshkrimin.",
    emptyTextCategory: "Kjo kategori nuk ka produkte për momentin.",
    emptyTextDefault: "Provoni një kërkim tjetër ose shfletoni kategoritë tona.",
    emptyAction: "Shiko të gjitha produktet",
    sortLabel: "Renditja:",
    sortAZ: "Emri A–Zh",
    sortZA: "Emri Zh–A",
    sortNewest: "Më të rejat",
    paginationLabel: "Faqet e produkteve",
    prevPage: "Faqja e mëparshme",
    nextPage: "Faqja tjetër",
    pageN: "Faqja {n}",
  },

  categoriesPage: {
    title: "Kategoritë",
    sub: "Shfletoni gamën tonë të plotë sipas kategorive dhe brendeve.",
    metaDescription:
      "Të gjitha kategoritë e produkteve të SHEMO PHARM: pajisje mjekësore, ortopedi, suplemente, kozmetikë, higjienë dhe shumë të tjera.",
    categoryMetaDescription:
      "{name} — shfletoni {count} produkte nga katalogu i SHEMO PHARM, distributor me shumicë i produkteve dhe pajisjeve mjekësore në Kosovë.",
    /** Why the numbers on the cards add up to more than the catalog holds. */
    overlapNote:
      "Një produkt mund të jetë në më shumë se një kategori — një shurup për fëmijë është njëkohësisht bar dhe produkt për fëmijë. Prandaj shumat e numrave më poshtë e kalojnë totalin: katalogu ka {total} produkte të ndryshme.",
    overlapLink: "Shiko të gjitha {total} produktet",
  },

  brandsPage: {
    title: "Markat",
    sub: "Bashkëpunojmë me brende të njohura ndërkombëtare për t'u ofruar barnatoreve dhe partnerëve produkte me cilësi të verifikuar.",
    metaDescription:
      "Brendet ndërkombëtare që distribuon SHEMO PHARM: Swiss Energy, Dr. Frei, Kräuterhof, Cansin, Sudocrem dhe shumë të tjera.",
    productCount: "{count} produkte",
    noProducts: "Së shpejti në katalog",
    moreTitle: "Brende të tjera në katalog",
    moreSub:
      "Marka me produkte në katalogun tonë që ende nuk kanë logo në listën më lart.",
  },

  offersPage: {
    title: "Oferta",
    sub: "Produkte me çmime të veçanta për barnatore dhe partnerë biznesi.",
    metaDescription:
      "Ofertat aktuale të SHEMO PHARM — produkte me çmime të veçanta për barnatore dhe partnerë biznesi.",
    emptyTitle: "Momentalisht nuk ka oferta aktive",
    emptyText:
      "Ofertat e reja publikohen këtu. Ndërkohë, hidhini një sy produkteve tona të veçuara — ose na kontaktoni për kushtet e porosive me shumicë.",
  },

  aboutPage: {
    title: "Rreth nesh",
    heading: "Ne kujdesemi për ju",
    intro:
      "Shemo Pharm operon si depo farmaceutike dhe distributor me shumicë i produkteve dhe pajisjeve mjekësore për territorin e Kosovës. Kompania është e licencuar nga Agjencia për Produkte dhe Pajisje Mjekësore, pranë Ministrisë së Shëndetësisë së Kosovës.",
    metaDescription:
      "SHEMO PHARM — depo farmaceutike dhe distributor me shumicë i produkteve dhe pajisjeve mjekësore në Kosovë, e licencuar nga Ministria e Shëndetësisë.",
    depotCaption: "Depoja jonë në Prizren — Rr. Ernest Koliqi 165/A",
    missionTitle: "Misioni ynë",
    missionText:
      "Të furnizojmë barnatoret dhe partnerët e sektorit të shëndetësisë në Kosovë me produkte dhe pajisje mjekësore cilësore, në kohë dhe me kushte korrekte — duke kontribuar në shëndetin dhe mirëqenien e komunitetit.",
    visionTitle: "Vizioni ynë",
    visionText:
      "Të jemi partneri më i besueshëm i shpërndarjes farmaceutike në rajon, duke zgjeruar vazhdimisht gamën e produkteve dhe duke ngritur standardet e shërbimit ndaj klientit.",
    valuesTitle: "Vlerat tona",
    values: [
      { title: "Cilësi", text: "Produkte të përzgjedhura nga brende të njohura, me standarde të verifikuara." },
      { title: "Besueshmëri", text: "Furnizim i rregullt dhe korrekt për çdo partner, në çdo porosi." },
      { title: "Përgjegjësi", text: "Trajtim i kujdesshëm i produkteve mjekësore në çdo hallkë të shpërndarjes." },
      { title: "Partneritet", text: "Marrëdhënie afatgjata me barnatore, profesionistë dhe furnitorë." },
      { title: "Përkushtim ndaj klientit", text: "Mbështetje dhe këshillim profesional për çdo kërkesë." },
    ],
    licenseTitle: "Licencim dhe përkushtim ndaj cilësisë",
    licenseText:
      "Shemo Pharm është e licencuar nga Agjencia për Produkte dhe Pajisje Mjekësore, pranë Ministrisë së Shëndetësisë së Republikës së Kosovës, për tregtimin me shumicë të produkteve dhe pajisjeve mjekësore. Çdo produkt trajtohet sipas kërkesave të ruajtjes dhe transportit të përcaktuara nga prodhuesi.",
    licenseCta: "Na kontaktoni për bashkëpunim",
  },

  contactPage: {
    title: "Kontakti",
    heading: "Na kontaktoni",
    sub: "Jemi në dispozicion për pyetje rreth produkteve, disponueshmërisë, çmimeve me shumicë dhe bashkëpunimit.",
    metaDescription:
      "Na kontaktoni: telefon, WhatsApp, email ose formulari i kontaktit. SHEMO PHARM, Rr. Ernest Koliqi 165/A, Prizren, Kosovë.",
    phone: "Telefoni",
    whatsappDirect: "Na shkruani direkt",
    email: "Email",
    address: "Adresa",
    hours: "Orari i punës",
    formTitle: "Dërgoni një mesazh",
    formSub: "Plotësoni formularin dhe do t'ju kontaktojmë sa më shpejt.",
  },

  contactForm: {
    name: "Emri dhe mbiemri",
    company: "Kompania ose barnatorja",
    phone: "Numri i telefonit",
    email: "Email",
    subject: "Subjekti",
    subjectPlaceholder: "p.sh. Pyetje për disponueshmërinë e një produkti",
    message: "Mesazhi",
    messagePlaceholder:
      "p.sh. Përshëndetje! Interesohem për produktin “A-Z Vitamine” (kodi 7159) — a e keni në stok dhe cili është çmimi me shumicë për 50 copë? Ju lutem më kontaktoni në numrin e mësipërm.",
    submit: "Dërgo mesazhin",
    successTitle: "Mesazhi u dërgua me sukses",
    successText:
      "Faleminderit që na kontaktuat! Ekipi i SHEMO PHARM do t'ju përgjigjet sa më shpejt.",
  },

  auth: {
    loginTitle: "Kyçu",
    loginMetaDescription:
      "Kyçuni në llogarinë tuaj të SHEMO PHARM për të parë çmimet me shumicë.",
    loginHeading: "Mirë se u kthyet",
    loginSub: "Kyçuni për të parë çmimet me shumicë",
    registerTitle: "Regjistrohu",
    registerMetaDescription:
      "Krijoni një llogari biznesi te SHEMO PHARM për qasje në çmimet me shumicë.",
    registerHeading: "Krijo llogari",
    registerSub: "Për barnatore dhe partnerë biznesi",
    email: "Email",
    password: "Fjalëkalimi",
    confirmPassword: "Përsërit fjalëkalimin",
    loginButton: "Kyçu",
    registerButton: "Regjistrohu",
    noAccount: "Nuk keni llogari?",
    haveAccount: "Keni llogari?",
    pendingNote:
      "Pas regjistrimit, llogaria juaj kërkon verifikim nga ekipi i SHEMO PHARM përpara se çmimet të bëhen të dukshme.",
    showPassword: "Shfaq fjalëkalimin",
    hidePassword: "Fshih fjalëkalimin",
    ruleMinChars: "Së paku 8 karaktere",
    ruleMatch: "Fjalëkalimet përputhen",
    forgotPassword: "Keni harruar fjalëkalimin?",
    forgotTitle: "Rivendos fjalëkalimin",
    forgotMetaDescription:
      "Kërkoni një lidhje për të rivendosur fjalëkalimin e llogarisë suaj te SHEMO PHARM.",
    forgotHeading: "Keni harruar fjalëkalimin?",
    forgotSub: "Shkruani email-in tuaj dhe ju dërgojmë një lidhje për ta rivendosur.",
    forgotButton: "Dërgo lidhjen",
    backToLogin: "Kthehu te kyçja",
    newPasswordHeading: "Zgjidhni një fjalëkalim të ri",
    newPasswordSub: "Lidhja u konfirmua. Vendosni fjalëkalimin e ri për {email}.",
    newPassword: "Fjalëkalimi i ri",
    newPasswordButton: "Ruaj fjalëkalimin",
    linkDeadHeading: "Lidhja nuk vlen më",
    linkExpiredText:
      "Lidhjet për rivendosje skadojnë pas një ore. Kërkoni një të re më poshtë.",
    linkUsedText:
      "Kjo lidhje është përdorur tashmë ose fjalëkalimi është ndryshuar që atëherë. Kërkoni një të re më poshtë.",
    linkInvalidText:
      "Kjo lidhje nuk mund të lexohet. Sigurohuni që e kopjuat të plotë, ose kërkoni një të re më poshtë.",
  },

  accountPage: {
    title: "Llogaria ime",
    verifiedTitle: "Llogari e verifikuar",
    verifiedText: "Çmimet me shumicë janë të dukshme për ju në të gjithë katalogun.",
    pendingTitle: "Llogaria në pritje të verifikimit",
    pendingText:
      "Ekipi i SHEMO PHARM do ta shqyrtojë regjistrimin tuaj. Pas verifikimit, çmimet me shumicë bëhen të dukshme automatikisht.",
    company: "Kompania / Barnatorja",
    phone: "Telefoni",
    memberSince: "Anëtar që nga",
    wishlist: "Lista e dëshirave",
    logout: "Dilni",
    dateLocale: "sq-AL",
    emailVerifiedTitle: "Email-i është verifikuar",
    emailUnverifiedTitle: "Verifikoni email-in tuaj",
    emailUnverifiedText:
      "Ju dërguam një lidhje verifikimi te {email}. Klikojeni për të konfirmuar adresën — kështu jemi të sigurt se ju gjejmë me përgjigjen e porosisë.",
    resendButton: "Dërgo përsëri lidhjen",
    ordersTitle: "Porositë e dërguara",
    ordersSub: "Ngarkojini përsëri në shportë me një klikim.",
    ordersEmpty: "Ende nuk keni dërguar asnjë porosi nga kjo llogari.",
    ordersItems: "{n} produkte",
    reorder: "Porosit përsëri",
    orderChannelWhatsapp: "Dërguar në WhatsApp",
    orderChannelEmail: "Dërguar me email",
  },

  verifyPage: {
    title: "Verifikimi i email-it",
    okTitle: "Email-i u verifikua",
    okText:
      "Faleminderit! Adresa juaj u konfirmua. Çmimet me shumicë shfaqen sapo ekipi i SHEMO PHARM ta aprovojë llogarinë.",
    alreadyTitle: "Kjo adresë është verifikuar tashmë",
    alreadyText: "Nuk nevojitet asnjë veprim tjetër.",
    expiredTitle: "Lidhja ka skaduar",
    expiredText:
      "Lidhjet e verifikimit vlejnë 24 orë. Kyçuni dhe kërkoni një lidhje të re nga llogaria juaj.",
    errorTitle: "Lidhja nuk është e vlefshme",
    errorText:
      "Sigurohuni që keni hapur lidhjen e plotë nga email-i, ose kërkoni një të re nga llogaria juaj.",
    toAccount: "Shko te llogaria",
    toLogin: "Kyçu",
  },

  cartPage: {
    title: "Shporta",
    sub: "Mblidhni produktet që ju interesojnë dhe dërgoni porosinë — ne ju përgjigjemi me konfirmimin e disponueshmërisë dhe çmimeve.",
    metaDescription:
      "Shporta juaj e porosisë — dërgojeni kërkesën përmes WhatsApp ose email te SHEMO PHARM.",
    loadFailed: "Shporta nuk u ngarkua. Provoni ta rifreskoni faqen.",
    emptyTitle: "Shporta juaj është bosh",
    emptyText: "Shtoni produkte në shportë dhe dërgoni porosinë përmes WhatsApp ose email.",
    summary: "Përmbledhja e porosisë",
    productsRow: "Produkte",
    totalQty: "Sasia totale",
    totalEstimate: "Totali (orientues)",
    loginForTotals: "për të parë çmimet me shumicë dhe totalin e porosisë.",
    loginWord: "Kyçuni",
    sendWhatsapp: "Dërgo porosinë në WhatsApp",
    sendEmail: "Dërgo me email",
    clearCart: "Zbraz shportën",
    note: "Kjo është një kërkesë porosie — ekipi i SHEMO PHARM ju kontakton për të konfirmuar disponueshmërinë, çmimet dhe dërgesën.",
    increaseFor: "Rrit sasinë për {name}",
    decreaseFor: "Zvogëlo sasinë për {name}",
    qtyInput: "Sasia",
    removeFor: "Hiq {name} nga shporta",
    removeWord: "Hiq",
    orderGreeting: "Përshëndetje! Dëshiroj të porosis:",
    orderClosing: "Ju lutem konfirmoni disponueshmërinë dhe çmimet. Faleminderit!",
    orderMailSubject: "Porosi e re nga uebfaqja",
    closeDrawer: "Mbyll shportën",
    viewFullCart: "Shiko shportën e plotë",
    addedToast: "{name} u shtua në shportë",
    viewCartShort: "Shiko shportën",
    orderSentTitle: "Porosia u nis",
    orderSentText:
      "Ekipi i SHEMO PHARM ju kontakton për të konfirmuar disponueshmërinë dhe çmimet.",
    keepCart: "Mbaje shportën",
  },

  wishlistPage: {
    title: "Lista e dëshirave",
    sub: "Produktet e ruajtura ruhen në pajisjen tuaj — mund t'i shqyrtoni dhe të na kontaktoni për porosi.",
    metaDescription: "Produktet që keni ruajtur në listën tuaj të dëshirave.",
    loadFailed: "Lista nuk u ngarkua. Provoni ta rifreskoni faqen.",
    emptyTitle: "Lista juaj është bosh",
    emptyText: "Shtoni produkte në listën e dëshirave duke klikuar ikonën e zemrës.",
  },

  sticky: {
    label: "Veprime të shpejta",
    call: "Thirr",
    whatsapp: "WhatsApp",
    products: "Produktet",
  },

  notFound: {
    eyebrow: "Gabim 404",
    title: "Faqja nuk u gjet",
    text: "Faqja që kërkuat mund të jetë zhvendosur ose nuk ekziston më.",
    backHome: "Kthehu në ballinë",
  },

  errorPage: {
    title: "Diçka shkoi keq",
    text: "Ndodhi një gabim i papritur. Ju lutemi provoni përsëri.",
    retry: "Provo përsëri",
  },

  actions: {
    tooManyAttempts: "Shumë tentativa. Provoni përsëri pas disa minutash.",
    invalidCredentials: "Email-i ose fjalëkalimi është i pasaktë.",
    vEmail: "Shkruani një email të vlefshëm.",
    vPassword: "Shkruani fjalëkalimin.",
    vPasswordMin: "Fjalëkalimi duhet të ketë të paktën 8 karaktere.",
    vPasswordMatch: "Fjalëkalimet nuk përputhen.",
    vName: "Shkruani emrin dhe mbiemrin.",
    vPhone: "Shkruani numrin e telefonit.",
    vSubject: "Shkruani subjektin.",
    vMessage: "Mesazhi duhet të ketë të paktën 10 karaktere.",
    emailTaken: "Ekziston një llogari me këtë email. Provoni të kyçeni.",
    sendFailed: "Dërgimi dështoi. Ju lutemi provoni përsëri.",
    contactTechProblem:
      "Mesazhi nuk u dërgua për shkak të një problemi teknik. Ju lutemi na telefononi ose na shkruani në WhatsApp.",
    verifySent: "Lidhja e verifikimit u dërgua. Kontrolloni email-in tuaj.",
    verifyWait:
      "Një lidhje u dërgua para pak kohësh. Kontrolloni email-in (edhe dosjen e spam-it) ose prisni disa minuta.",
    /** Deliberately says nothing about whether the address exists. */
    resetSent:
      "Nëse kjo adresë ka një llogari, lidhja për rivendosjen e fjalëkalimit sapo u dërgua. Kontrolloni email-in, edhe dosjen e spam-it.",
    resetLinkDead:
      "Kjo lidhje nuk vlen më. Ajo skadon pas një ore dhe funksionon vetëm një herë — kërkoni një të re.",
  },

  /** Copy for the transactional emails — see src/lib/mail-templates.ts. */
  mail: {
    verifySubject: "Verifikoni email-in tuaj — SHEMO PHARM",
    verifyHeading: "Verifikoni adresën tuaj",
    verifyIntro: "Përshëndetje {name}, faleminderit që u regjistruat te SHEMO PHARM.",
    verifyBody: "Klikoni butonin më poshtë për të konfirmuar se kjo adresë ju përket.",
    verifyButton: "Verifiko email-in",
    verifyFallback: "Nëse butoni nuk funksionon, kopjoni këtë lidhje në shfletues:",
    verifyExpiry: "Kjo lidhje vlen 24 orë.",
    verifyIgnore: "Nëse nuk e keni bërë ju këtë regjistrim, injorojeni këtë mesazh.",
    resetSubject: "Rivendosni fjalëkalimin — SHEMO PHARM",
    resetHeading: "Rivendosni fjalëkalimin",
    resetIntro: "Përshëndetje {name},",
    resetBody:
      "Morëm një kërkesë për të rivendosur fjalëkalimin e llogarisë suaj. Klikoni butonin më poshtë për të zgjedhur një të ri.",
    resetButton: "Zgjidh fjalëkalim të ri",
    resetExpiry: "Kjo lidhje vlen një orë dhe mund të përdoret vetëm një herë.",
    resetIgnore:
      "Nëse nuk e keni kërkuar ju këtë, injorojeni këtë mesazh — fjalëkalimi juaj mbetet i pandryshuar.",
    approvedSubject: "Llogaria juaj u aprovua — SHEMO PHARM",
    approvedHeading: "Llogaria juaj është aktive",
    approvedIntro: "Përshëndetje {name},",
    approvedBody:
      "Ekipi i SHEMO PHARM e aprovoi llogarinë tuaj. Çmimet me shumicë tani janë të dukshme në të gjithë katalogun.",
    approvedButton: "Shiko produktet",
    footerNote:
      "SHEMO PHARM — depo farmaceutike dhe distributor me shumicë, Prizren, Kosovë.",
  },
};

export type Dictionary = typeof sq;
