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
    quickLinks: "Linqe të Shpejta",
    allCategories: "Shiko të gjitha kategoritë",
    loginRegister: "Kyçu / Regjistrohu",
    accountWithName: "Llogaria ({name})",
    homeAria: "SHEMO PHARM — Ballina",
    langLabel: "Gjuha",
  },

  header: {
    trust: [
      "Distributor i licencuar nga MSh e Kosovës",
      "2000+ produkte nga brende ndërkombëtare",
      "Këshillim profesional",
    ],
    searchOpen: "Kërko produkte",
    megaPromoTitle: "Oferta të veçanta",
    megaPromoText: "Çmime të veçanta për barnatore dhe partnerë biznesi.",
    megaPromoCta: "Shiko Ofertat",
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
    h1a: "Shëndeti juaj,",
    h1b: "prioriteti ynë.",
    sub: "Më shumë se 2000 produkte farmaceutike dhe medicinale të zgjedhura me kujdes — furnizim i besueshëm për barnatore, institucione dhe familje në gjithë Kosovën.",
    ctaProducts: "Shiko Produktet",
    ctaContact: "Na Kontaktoni",
    trustLicensed: "Distributor i licencuar",
    trustAdvice: "Këshillim profesional",
    trustWhatsapp: "Porosi përmes WhatsApp",
    portraitAlt: "Farmaciste profesionale para rafteve me produkte",
    depotAlt: "Depoja e SHEMO PHARM në Prizren",
    depotCaption: "Depoja jonë në Prizren",
    stockValue: "2000+",
    stockLabel: "produkte në stok",
  },

  stats: {
    label: "Shifrat e kompanisë",
    labels: ["Klientë", "Produkte", "Partnerë dhe brende", "Barnatore"],
  },

  home: {
    categoriesEyebrow: "Katalogu ynë",
    categoriesTitle: "Kategoritë Popullore",
    featuredEyebrow: "Të zgjedhura për ju",
    featuredTitle: "Produktet e Veçuara",
    featuredSubtitle: "Një përzgjedhje nga katalogu ynë",
    devicesEyebrow: "Aparatura",
    devicesTitle: "Pajisje dhe aparatura mjekësore",
    devicesSubtitle: "Teknologji mjekësore për përdorim profesional dhe shtëpiak",
    uspEyebrow: "Cilësi. Besim. Kujdes.",
    uspTitle: "Besim që ndërtohet çdo ditë",
    uspSub: "Kujdes profesional, produkte të zgjedhura dhe shërbim i qëndrueshëm për barnatore dhe partnerë.",
    uspLabel: "Pse SHEMO PHARM",
    usp: [
      { title: "Distributor i licencuar", text: "Nga Agjencia e MSh së Kosovës" },
      { title: "Produkte origjinale", text: "Nga brende ndërkombëtare të njohura" },
      { title: "Këshillim profesional", text: "Ekipi ynë është këtu për ju" },
      { title: "Mbi 2000 produkte", text: "Zgjedhje e gjerë në katalogun tonë" },
      { title: "Furnizim për barnatore", text: "Partneritet i besueshëm me shumicë" },
      { title: "Porosi të lehta", text: "Përmes WhatsApp ose telefonit" },
    ],
    adviceEyebrow: "Këshillim profesional",
    adviceTitle1: "Këshillim profesional",
    adviceTitle2: "kurdo që keni nevojë.",
    adviceSub: "Ekipi ynë është gjithmonë i gatshëm t'ju ndihmojë — profesionalisht dhe pa komplikime.",
    adviceServices: [
      "Rekomandime produktesh sipas nevojës suaj",
      "Informacion mbi disponueshmërinë dhe stokun",
      "Porosi me shumicë për barnatore dhe institucione",
    ],
    adviceImageAlt: "Ekipi duke pranuar porosi në telefon dhe duke punuar në kompjuter",
    hoursTitle: "Orari i Punës",
    hoursDays: "E Hënë – E Premte",
    hoursTime: "09:00 – 18:00",
    brandsEyebrow: "Partnerët tanë",
    brandsTitle: "Brendet që distribuojmë",
    brandsSub: "Bashkëpunojmë me brende të njohura ndërkombëtare",
    newsletterTitle: "Qëndroni të informuar",
    newsletterSub: "Abonohuni për produktet e reja dhe njoftimet e SHEMO PHARM.",
    newsletterEmailLabel: "Adresa juaj e email-it",
    newsletterPlaceholder: "Email juaj",
    newsletterButton: "Abonohu",
    newsletterSuccess: "Faleminderit! Jeni abonuar me sukses.",
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
    contactTitle: "Na Kontaktoni",
    facebookAria: "SHEMO PHARM në Facebook",
    instagramAria: "SHEMO PHARM në Instagram",
    rights: "© {year} SHEMO PHARM. Të gjitha të drejtat e rezervuara.",
    licensed:
      "Licencuar nga Agjencia për Produkte dhe Pajisje Mjekësore — Ministria e Shëndetësisë e Kosovës",
  },

  product: {
    codeLabel: "Kodi i produktit:",
    loginForPrice: "Kyçu për çmimin",
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
    allProducts: "Të gjitha produktet",
    categoriesHeading: "Kategoritë",
    searchInResults: "Kërko në këto produkte…",
    searchChip: "Kërkimi: “{q}”",
    categoryChip: "Kategoria: {name}",
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
  },

  brandsPage: {
    title: "Markat",
    sub: "Bashkëpunojmë me brende të njohura ndërkombëtare për t'u ofruar barnatoreve dhe partnerëve produkte me cilësi të verifikuar.",
    metaDescription:
      "Brendet ndërkombëtare që distribuon SHEMO PHARM: Swiss Energy, Dr. Frei, Kräuterhof, Cansin, Sudocrem dhe shumë të tjera.",
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
    message: "Mesazhi",
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
    removeFor: "Hiq {name} nga shporta",
    removeWord: "Hiq",
    orderGreeting: "Përshëndetje! Dëshiroj të porosis:",
    orderClosing: "Ju lutem konfirmoni disponueshmërinë dhe çmimet. Faleminderit!",
    orderMailSubject: "Porosi e re nga uebfaqja",
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
    newsletterInvalid: "Shkruani një adresë email të vlefshme.",
    newsletterFailed: "Regjistrimi dështoi. Ju lutemi provoni përsëri.",
  },
};

export type Dictionary = typeof sq;
