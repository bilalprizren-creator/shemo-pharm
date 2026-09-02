import type { Dictionary } from "./sq";

/** English UI strings — must satisfy the shape defined by sq.ts. */
export const en: Dictionary = {
  lang: "en",

  site: {
    tagline: "Wholesale distributor of medical devices and products",
    titleDefault: "SHEMO PHARM | Medical products and devices in Kosovo",
    description:
      "SHEMO PHARM is a pharmaceutical warehouse and wholesale distributor of medical products and devices, orthopedic products, supplements and personal-care items in Kosovo.",
  },

  common: {
    skipToContent: "Skip to content",
    viewAll: "View all",
    viewProducts: "View products",
    browseProducts: "Browse products",
    productsSuffix: "products",
    loading: "Loading…",
    optional: "(optional)",
    honeypotLabel: "Do not fill in this field",
    piece: "pcs",
    code: "Code",
  },

  nav: {
    home: "Home",
    products: "Products",
    categories: "Categories",
    brands: "Brands",
    offers: "Offers",
    about: "About us",
    contact: "Contact",
    account: "Account",
    wishlist: "Wishlist",
    cart: "Cart",
    catalog: "Catalog",
    mainLabel: "Main navigation",
    menuLabel: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    quickLinks: "Quick links",
    allCategories: "View all categories",
    loginRegister: "Log in / Register",
    accountWithName: "Account ({name})",
    homeAria: "SHEMO PHARM — Home",
    langLabel: "Language",
  },

  header: {
    trust: [
      "Licensed distributor by the Kosovo Ministry of Health",
      "Delivery across Kosovo",
    ],
    requestQuote: "Request a quote",
    partnerLogin: "Partner login",
    searchOpen: "Search products",
    megaPromoTitle: "Special offers",
    megaPromoText: "Special prices for pharmacies and business partners.",
    megaPromoCta: "View offers",
  },

  search: {
    label: "Search products",
    placeholder: "Search products, brands, categories…",
    button: "Search",
    clear: "Clear search",
    suggestionsLabel: "Search suggestions",
    noResults: "No products found for “{q}”",
    viewAllResults: "View all results ({total})",
  },

  hero: {
    eyebrow: "Licensed pharmaceutical distributor in Kosovo",
    h1a: "The pharmaceutical supply",
    h1b: "Kosovo trusts.",
    sub: "Over 3,000 products and professional supply for pharmacies, institutions and healthcare partners across Kosovo.",
    ctaProducts: "View products",
    ctaContact: "Contact us",
    trustLicensed: "Licensed distributor",
    trustProducts: "3,000+ products",
    trustSupply: "Delivery across Kosovo",
    badge: "Licensed by the Kosovo Ministry of Health",
    imageAlt:
      "A SHEMO Pharm pharmacist advising a mother and her daughter at the counter",
    depotAlt: "The SHEMO PHARM warehouse in Prizren",
  },

  stats: {
    label: "Company figures",
    labels: ["Clients", "Products", "Partner brands", "Pharmacies", "Depots"],
  },

  home: {
    categoriesEyebrow: "Our catalog",
    categoriesTitle: "Main categories",
    categoriesSub:
      "Choose by category and quickly find the products you need.",
    /** Blurbs only — the card title is the category's own display name. */
    categoryCards: {
      barnat: "Pharmaceutical products from well-known brands",
      suplemente: "Vitamins, minerals and dietary supplements",
      kozmetike: "Skincare and hygiene products",
      ortopedi: "Supports, braces and orthopedic solutions",
      "paisje-medicinale": "Measuring instruments and devices for professional use",
      "alkool-dhe-antiseptik": "Disinfectants and antiseptic products",
      fasha: "Bandages, plasters and wound-care materials",
      vajra: "Natural oils and medicinal teas",
    },
    featuredEyebrow: "Picked for you",
    featuredTitle: "Featured products",
    featuredSubtitle: "A selection from our catalog",
    featuredCta: "Browse the 3,000+ product catalog",
    whyEyebrow: "Why SHEMO Pharm",
    whyTitle: "Why partners trust us",
    whySub:
      "Serving pharmacies, institutions and healthcare professionals — with a wide catalog, dependable supply and professional advice.",
    whyItems: [
      {
        title: "Licensed distributor",
        text: "Licensed by the Agency for Medical Products and Devices, Kosovo Ministry of Health.",
      },
      {
        title: "Wide catalog",
        text: "A full range of pharmaceutical, medical and personal-care products in one place.",
      },
      {
        title: "Well-known brands",
        text: "Partnerships with well-known international and local brands.",
      },
      {
        title: "Professional advice",
        text: "Our team helps you choose the right products for your needs.",
      },
      {
        title: "Dependable supply",
        text: "Reliable, on-time deliveries across all of Kosovo.",
      },
      {
        title: "Physical network",
        text: "Pharmacies and depots for fast access and secure stock across Kosovo.",
      },
    ],
    networkEyebrow: "Our network",
    networkTitle: "A reliable network for supply and distribution",
    networkSub:
      "With 12 pharmacies and 2 depots, SHEMO Pharm provides dependable supply, fast access to products and professional support for clients across Kosovo.",
    networkPharmacies: "Pharmacies",
    networkDepots: "Depots",
    networkPoints: [
      "Nationwide coverage with fast, reliable deliveries",
      "Professional storage and handling of medical products",
      "Dependable supply for pharmacies, institutions and professionals",
    ],
    networkImageAlt: "The depot and distribution center",
    networkImageAlt2: "One of our pharmacies",
    adviceEyebrow: "Professional advice",
    adviceTitle1: "Professional advice",
    adviceTitle2: "whenever you need it.",
    adviceSub: "Our team helps you find the most suitable products and solutions for your pharmacy, institution or family.",
    adviceWhatsapp: "Chat on WhatsApp",
    adviceServices: [
      "Product recommendations for your needs",
      "Availability and stock information",
      "Wholesale orders for pharmacies and institutions",
    ],
    adviceImageAlt:
      "Two SHEMO Pharm pharmacists reviewing an order on a laptop behind the counter",
    hoursTitle: "Working hours",
    hoursDays: "Monday – Friday",
    hoursTime: "09:00 – 18:00",
    brandsEyebrow: "Our partners",
    brandsTitle: "Brands we distribute",
    brandsSub: "We work with well-known international brands",
    brandsCta: "View all brands",
  },

  cta: {
    title: "Need help choosing products?",
    sub: "Contact our team for information about products, availability and cooperation.",
    whatsapp: "Message us on WhatsApp",
    contact: "Contact",
  },

  footer: {
    blurb:
      "SHEMO PHARM supplies pharmacies and professional partners in Kosovo with medical and orthopedic products, supplements and personal-care items from well-known international brands.",
    categories: "Categories",
    contactTitle: "Contact us",
    facebookAria: "SHEMO PHARM on Facebook",
    instagramAria: "SHEMO PHARM on Instagram",
    legalNav: "Legal information",
    rights: "© {year} SHEMO PHARM. All rights reserved.",
    licensed:
      "Licensed by the Agency for Medical Products and Devices, Kosovo Ministry of Health",
  },

  /** See the note on `legal` in sq.ts — including when to remove draftNotice. */
  legal: {
    draftNotice:
      "This text is a draft written from how the site technically works and has not yet been reviewed by a lawyer. It must be approved by legal counsel before final publication.",
    lastUpdatedLabel: "Last updated",
    lastUpdated: "12 August 2026",

    /** See the note in sq.ts on why this is a sentence and not a checkbox. */
    formNotice: "We use what you send only to get back to you. Read our {link}.",
    formNoticeLink: "privacy policy",

    privacy: {
      title: "Privacy policy",
      metaDescription:
        "How SHEMO PHARM collects, uses and stores the personal data of visitors and partners — cookies, forms, orders and your rights.",
      intro:
        "This page explains which personal data we collect when you use shemo-pharm, why we collect it and what you can ask of us. It is short, because the site collects little.",
      sections: [
        {
          heading: "Who is responsible",
          body: [
            "The controller for this processing is SHEMO PHARM, Rr. Ernest Koliqi 165/A, 20000 Prizren, Kosovo.",
            "For any question about your data, write to info@shemopharm.com or call +383 (0) 49 600 934.",
          ],
        },
        {
          heading: "What we collect, and when",
          body: [
            "Contact form: the name, company, phone number, email address, subject and message you write. We keep these so we can answer you and so the enquiry is not lost.",
            "Partner registration: name, company, phone, email and a password. The password is never stored as you typed it — only a value derived from it is kept, and the password cannot be recovered from that value.",
            "Orders: the products and quantities you put in the basket, the channel you choose (WhatsApp or email) and, if you are signed in, your account's name and email.",
            "We collect no health data, and we never ask for data that is not needed for the business relationship.",
          ],
        },
        {
          heading: "Legal basis",
          body: [
            "Contact-form and registration data are processed in order to prepare or perform a business relationship with you or your company.",
            "The minimal technical data described below is processed on our legitimate interest in keeping the site working and protected from abuse.",
          ],
        },
        {
          heading: "Cookies and browser storage",
          body: [
            "We use a single cookie, shemo_session. It is created only when you sign in, keeps your session for seven days (one day for administrator accounts) and cannot be read by scripts on the page. Without it you cannot sign in — which is what makes it strictly necessary.",
            "The basket and the wishlist are stored in your own browser, under shemo-cart and shemo-wishlist. They hold only product identifiers and quantities, contain no personal data, and are sent nowhere until you send an order yourself.",
            "We use no analytics tool, no advertising pixel and no third-party script. That is why this site shows no cookie consent banner: there is nothing to consent to.",
          ],
        },
        {
          heading: "Who processes data for us",
          body: [
            "The site is hosted on Vercel, the database runs on Neon and photographs are served from Vercel Blob. Transactional email — address verification and password reset — is sent through Resend.",
            "When you send an order over WhatsApp, the order text passes through WhatsApp and is subject to Meta's terms. If you would rather avoid that, use email or the phone.",
          ],
        },
        {
          heading: "IP addresses",
          body: [
            "To stop the forms and the sign-in from being abused, we count requests per visitor. Your IP address is not stored in full: only a hashed value derived from it is kept, which cannot be turned back into an address and identifies no one.",
          ],
        },
        {
          heading: "How long we keep it",
          body: [
            "Contact messages and orders are kept for as long as they are needed for the business relationship and for statutory record-keeping obligations.",
            "Partner accounts are kept until you ask for the account to be deleted.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You have the right to request access to your data, its correction, its deletion, a restriction of processing, and to object to processing.",
            "To exercise these rights, write to info@shemopharm.com. We answer within the periods set by data-protection law.",
            "If you believe your data has not been handled properly, you may complain to the Information and Privacy Agency of the Republic of Kosovo.",
          ],
        },
        {
          heading: "Changes to this policy",
          body: [
            "If we change how we process data, we update this page and the date above.",
          ],
        },
      ],
    },

    terms: {
      title: "Terms of use",
      metaDescription:
        "Terms of use for the SHEMO PHARM site — partner accounts, wholesale prices, orders and product information.",
      intro:
        "These terms apply to the use of this site. By browsing it or creating an account, you agree to follow them.",
      sections: [
        {
          heading: "Who this site is for",
          body: [
            "SHEMO PHARM is a pharmaceutical warehouse and wholesale distributor. This site addresses pharmacies, health institutions and professional partners — not retail sale to end consumers.",
          ],
        },
        {
          heading: "Accounts and prices",
          body: [
            "Registration is open, but an account becomes active only after our team has verified it. Until then the catalog is shown in full, but without prices.",
            "Wholesale prices are visible only to approved accounts and are intended for business use. You are responsible for keeping your password safe and for what is done with your account.",
          ],
        },
        {
          heading: "Prices and availability",
          body: [
            "Prices and availability are indicative and may change. They do not constitute a binding offer.",
            "Product data comes from our suppliers and we work to keep it accurate, but errors and packaging changes cannot be ruled out.",
          ],
        },
        {
          heading: "Orders",
          body: [
            "The basket on this site is a request for a quote, not a purchase. When you send it over WhatsApp or email, we come back to you confirming availability and prices.",
            "An agreement is formed only after our confirmation. Until then neither side is under any obligation.",
          ],
        },
        {
          heading: "Product information",
          body: [
            "The descriptions on this site are commercial information and are not medical or pharmaceutical advice.",
            "The manufacturer's leaflet applies to every product. For use, dosage and contraindications, consult your pharmacist or doctor.",
          ],
        },
        {
          heading: "Site content",
          body: [
            "The name, logo, texts and photographs on this site belong to SHEMO PHARM or to the respective manufacturers and may not be used without permission.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "We work to keep the site available and accurate, but we do not guarantee uninterrupted operation and accept no liability for damage arising from temporary unavailability or from errors in product data.",
          ],
        },
        {
          heading: "Applicable law",
          body: ["The law of the Republic of Kosovo applies to these terms."],
        },
      ],
    },
  },

  product: {
    codeLabel: "Product code:",
    loginForPrice: "Log in to see the price",
    outOfStock: "Out of stock",
    inStock: "In stock",
    availability: "Availability:",
    wholesalePrice: "Wholesale price",
    pricesHidden: "Prices are visible only to logged-in customers",
    loginToSeePrice: "Log in to see the price",
    orderHeading: "Order or request information",
    orderWhatsapp: "Order via WhatsApp",
    callUs: "Call us",
    email: "Email",
    infoNote:
      "For detailed information about the product, availability and wholesale order terms, contact the SHEMO PHARM team.",
    related: "Similar products",
    whatsappInterest: "Hello! I am interested in the product: {name}",
    mailSubject: "Inquiry about the product: {name}",
    galleryLabel: "Product images",
    galleryImage: "Image {i} of {total}",
    addToCart: "Add to cart",
    addedToCart: "Added to cart",
    addToCartAria: "Add “{name}” to cart",
    increaseQty: "Increase quantity",
    decreaseQty: "Decrease quantity",
    qtyLabel: "Quantity: {qty}",
    qtyInput: "Quantity",
    wishlistAdd: "Add “{name}” to the wishlist",
    wishlistRemove: "Remove “{name}” from the wishlist",
    discountBadge: "-{pct}%",
  },

  catalog: {
    title: "Products",
    subtitle: "The complete catalog of medical products and devices",
    metaDescription:
      "Browse the complete SHEMO PHARM catalog: medical devices, orthopedic products, supplements, cosmetics and personal-care products.",
    breadcrumbLabel: "Breadcrumb",
    productsCount: "{n} products",
    filters: "Filters",
    closeFilters: "Close filters",
    activeFilters: "Active filters",
    filterByCategory: "Filter by category",
    filterByType: "Filter by product type",
    typesHeading: "Product types",
    brandHeading: "Brand",
    allOfBrand: "Everything from this brand",
    typeChip: "Type: {name}",
    allProducts: "All products",
    categoriesHeading: "Categories",
    searchInResults: "Search within these products…",
    searchSubmit: "Search",
    searchClear: "Clear search",
    searching: "Searching…",
    searchChip: "Search: “{q}”",
    categoryChip: "Category: {name}",
    inStockOnly: "In stock only",
    inStockChip: "In stock only",
    removeFilter: "— remove filter",
    clearFilters: "Clear filters",
    emptyTitle: "No products found",
    emptyTextQuery:
      "We found no products for \"{q}\". Try another term or check the spelling.",
    emptyTextCategory: "This category has no products at the moment.",
    emptyTextDefault: "Try another search or browse our categories.",
    emptyAction: "View all products",
    share: "Share",
    shareHint: "Share this product listing exactly as it is filtered",
    linkCopied: "Link copied",
    copyLinkManually: "Copy the link",
    closeShareLink: "Close",
    sortLabel: "Sort:",
    sortAZ: "Name A–Z",
    sortZA: "Name Z–A",
    sortNewest: "Newest",
    paginationLabel: "Product pages",
    prevPage: "Previous page",
    nextPage: "Next page",
    pageN: "Page {n}",
  },

  categoriesPage: {
    title: "Categories",
    sub: "Browse our full range by category and brand.",
    metaDescription:
      "All SHEMO PHARM product categories: medical devices, orthopedics, supplements, cosmetics, hygiene and many more.",
    categoryMetaDescription:
      "{name} — browse {count} products from the SHEMO PHARM catalog, a wholesale distributor of medical products and devices in Kosovo.",
    overlapNote:
      "A product can sit in more than one category — a children's cough syrup is both a medicine and a children's product. That is why the numbers below add up to more than the total: the catalog holds {total} distinct products.",
    overlapLink: "Browse all {total} products",
  },

  brandsPage: {
    title: "Brands",
    sub: "We work with well-known international brands to offer pharmacies and partners products of verified quality.",
    metaDescription:
      "International brands distributed by SHEMO PHARM: Swiss Energy, Dr. Frei, Kräuterhof, Cansin, Sudocrem and many more.",
    productCount: "{count} products",
    noProducts: "Coming to the catalog",
    moreTitle: "More brands in the catalog",
    moreSub: "Brands with products in our catalog that do not yet have a logo above.",
  },

  offersPage: {
    title: "Offers",
    sub: "Products with special prices for pharmacies and business partners.",
    metaDescription:
      "Current SHEMO PHARM offers — products with special prices for pharmacies and business partners.",
    emptyTitle: "There are no active offers at the moment",
    emptyText:
      "New offers are published here. In the meantime, take a look at our featured products — or contact us about wholesale order terms.",
  },

  aboutPage: {
    title: "About us",
    heading: "We care for you",
    intro:
      "Shemo Pharm operates as a pharmaceutical warehouse and wholesale distributor of medical products and devices for the territory of Kosovo. The company is licensed by the Agency for Medical Products and Devices at the Kosovo Ministry of Health.",
    metaDescription:
      "SHEMO PHARM — a pharmaceutical warehouse and wholesale distributor of medical products and devices in Kosovo, licensed by the Ministry of Health.",
    depotCaption: "Our warehouse in Prizren — Rr. Ernest Koliqi 165/A",
    missionTitle: "Our mission",
    missionText:
      "To supply pharmacies and healthcare partners in Kosovo with quality medical products and devices, on time and on fair terms — contributing to the health and well-being of the community.",
    visionTitle: "Our vision",
    visionText:
      "To be the most trusted pharmaceutical distribution partner in the region, continuously expanding our product range and raising customer-service standards.",
    valuesTitle: "Our values",
    values: [
      { title: "Quality", text: "Products selected from well-known brands, with verified standards." },
      { title: "Reliability", text: "Regular, correct supply for every partner, on every order." },
      { title: "Responsibility", text: "Careful handling of medical products at every step of distribution." },
      { title: "Partnership", text: "Long-term relationships with pharmacies, professionals and suppliers." },
      { title: "Customer dedication", text: "Support and professional advice for every request." },
    ],
    licenseTitle: "Licensing and commitment to quality",
    licenseText:
      "Shemo Pharm is licensed by the Agency for Medical Products and Devices at the Ministry of Health of the Republic of Kosovo for the wholesale trade of medical products and devices. Every product is handled according to the storage and transport requirements set by the manufacturer.",
    licenseCta: "Contact us about cooperation",
  },

  contactPage: {
    title: "Contact",
    heading: "Contact us",
    sub: "We are available for questions about products, availability, wholesale prices and cooperation.",
    metaDescription:
      "Contact us: phone, WhatsApp, email or the contact form. SHEMO PHARM, Rr. Ernest Koliqi 165/A, Prizren, Kosovo.",
    phone: "Phone",
    whatsappDirect: "Message us directly",
    email: "Email",
    address: "Address",
    hours: "Working hours",
    formTitle: "Send a message",
    formSub: "Fill in the form and we will contact you as soon as possible.",
  },

  contactForm: {
    name: "Full name",
    company: "Company or pharmacy",
    phone: "Phone number",
    email: "Email",
    subject: "Subject",
    subjectPlaceholder: "e.g. Question about product availability",
    message: "Message",
    messagePlaceholder:
      "e.g. Hello! I am interested in the product “A-Z Vitamine” (code 7159) — is it in stock, and what is the wholesale price for 50 pieces? Please contact me at the number above.",
    submit: "Send message",
    successTitle: "Message sent successfully",
    successText:
      "Thank you for contacting us! The SHEMO PHARM team will reply as soon as possible.",
  },

  auth: {
    loginTitle: "Log in",
    loginMetaDescription:
      "Log in to your SHEMO PHARM account to see wholesale prices.",
    loginHeading: "Welcome back",
    loginSub: "Log in to see wholesale prices",
    registerTitle: "Register",
    registerMetaDescription:
      "Create a business account at SHEMO PHARM for access to wholesale prices.",
    registerHeading: "Create an account",
    registerSub: "For pharmacies and business partners",
    email: "Email",
    password: "Password",
    confirmPassword: "Repeat password",
    loginButton: "Log in",
    registerButton: "Register",
    noAccount: "No account yet?",
    haveAccount: "Already have an account?",
    pendingNote:
      "After registration, your account needs verification by the SHEMO PHARM team before prices become visible.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    ruleMinChars: "At least 8 characters",
    ruleMatch: "Passwords match",
    forgotPassword: "Forgot your password?",
    forgotTitle: "Reset password",
    forgotMetaDescription:
      "Request a link to reset the password of your SHEMO PHARM account.",
    forgotHeading: "Forgot your password?",
    forgotSub: "Enter your email and we will send you a link to reset it.",
    forgotButton: "Send the link",
    backToLogin: "Back to login",
    newPasswordHeading: "Choose a new password",
    newPasswordSub: "Link confirmed. Set the new password for {email}.",
    newPassword: "New password",
    newPasswordButton: "Save password",
    linkDeadHeading: "This link is no longer valid",
    linkExpiredText: "Reset links expire after an hour. Request a new one below.",
    linkUsedText:
      "This link has already been used, or the password has changed since. Request a new one below.",
    linkInvalidText:
      "This link cannot be read. Make sure you copied it in full, or request a new one below.",
  },

  accountPage: {
    title: "My account",
    verifiedTitle: "Verified account",
    verifiedText: "Wholesale prices are visible to you across the entire catalog.",
    pendingTitle: "Account pending verification",
    pendingText:
      "The SHEMO PHARM team will review your registration. After verification, wholesale prices become visible automatically.",
    company: "Company / Pharmacy",
    phone: "Phone",
    memberSince: "Member since",
    wishlist: "Wishlist",
    logout: "Log out",
    dateLocale: "en-GB",
    emailVerifiedTitle: "Email verified",
    emailUnverifiedTitle: "Verify your email",
    emailUnverifiedText:
      "We sent a verification link to {email}. Click it to confirm the address — that way we can reach you with the answer to your order.",
    resendButton: "Resend the link",
    ordersTitle: "Orders you sent",
    ordersSub: "Load any of them back into the cart with one click.",
    ordersEmpty: "You have not sent an order from this account yet.",
    ordersItems: "{n} products",
    reorder: "Order again",
    orderChannelWhatsapp: "Sent on WhatsApp",
    orderChannelEmail: "Sent by email",
  },

  verifyPage: {
    title: "Email verification",
    okTitle: "Email verified",
    okText:
      "Thank you! Your address is confirmed. Wholesale prices appear as soon as the SHEMO PHARM team approves your account.",
    alreadyTitle: "This address is already verified",
    alreadyText: "No further action is needed.",
    expiredTitle: "The link has expired",
    expiredText:
      "Verification links are valid for 24 hours. Log in and request a new one from your account.",
    errorTitle: "The link is not valid",
    errorText:
      "Make sure you opened the full link from the email, or request a new one from your account.",
    toAccount: "Go to my account",
    toLogin: "Log in",
  },

  cartPage: {
    title: "Cart",
    sub: "Collect the products you are interested in and send the order — we reply with availability and price confirmation.",
    metaDescription:
      "Your order cart — send the request via WhatsApp or email to SHEMO PHARM.",
    loadFailed: "The cart failed to load. Try refreshing the page.",
    emptyTitle: "Your cart is empty",
    emptyText: "Add products to the cart and send the order via WhatsApp or email.",
    summary: "Order summary",
    productsRow: "Products",
    totalQty: "Total quantity",
    totalEstimate: "Total (indicative)",
    loginForTotals: "to see wholesale prices and the order total.",
    loginWord: "Log in",
    sendWhatsapp: "Send the order on WhatsApp",
    sendEmail: "Send by email",
    clearCart: "Empty the cart",
    note: "This is an order request — the SHEMO PHARM team contacts you to confirm availability, prices and delivery.",
    increaseFor: "Increase quantity for {name}",
    decreaseFor: "Decrease quantity for {name}",
    qtyInput: "Quantity",
    removeFor: "Remove {name} from the cart",
    removeWord: "Remove",
    orderGreeting: "Hello! I would like to order:",
    orderClosing: "Please confirm availability and prices. Thank you!",
    orderMailSubject: "New order from the website",
    closeDrawer: "Close the cart",
    viewFullCart: "View the full cart",
    addedToast: "{name} was added to the cart",
    viewCartShort: "View the cart",
    orderSentTitle: "Order on its way",
    orderSentText:
      "The SHEMO PHARM team will contact you to confirm availability and prices.",
    keepCart: "Keep the cart",
  },

  wishlistPage: {
    title: "Wishlist",
    sub: "Saved products are stored on your device — review them and contact us to order.",
    metaDescription: "The products you saved to your wishlist.",
    loadFailed: "The list failed to load. Try refreshing the page.",
    emptyTitle: "Your list is empty",
    emptyText: "Add products to the wishlist by clicking the heart icon.",
  },

  sticky: {
    label: "Quick actions",
    call: "Call",
    whatsapp: "WhatsApp",
    products: "Products",
  },

  notFound: {
    eyebrow: "Error 404",
    title: "Page not found",
    text: "The page you requested may have moved or no longer exists.",
    backHome: "Back to home",
  },

  errorPage: {
    title: "Something went wrong",
    text: "An unexpected error occurred. Please try again.",
    retry: "Try again",
  },

  actions: {
    tooManyAttempts: "Too many attempts. Try again in a few minutes.",
    invalidCredentials: "The email or password is incorrect.",
    vEmail: "Enter a valid email.",
    vPassword: "Enter your password.",
    vPasswordMin: "The password must be at least 8 characters.",
    vPasswordMatch: "The passwords do not match.",
    vName: "Enter your full name.",
    vPhone: "Enter your phone number.",
    vSubject: "Enter a subject.",
    vMessage: "The message must be at least 10 characters.",
    emailTaken: "An account with this email exists. Try logging in.",
    sendFailed: "Sending failed. Please try again.",
    contactTechProblem:
      "The message was not sent due to a technical problem. Please call us or message us on WhatsApp.",
    verifySent: "Verification link sent. Check your inbox.",
    verifyWait:
      "A link was sent a moment ago. Check your inbox (including spam) or wait a few minutes.",
    resetSent:
      "If this address has an account, a password reset link has just been sent. Check your inbox, including spam.",
    resetLinkDead:
      "This link is no longer valid. It expires after an hour and works only once — request a new one.",
  },

  /** Copy for the transactional emails — see src/lib/mail-templates.ts. */
  mail: {
    verifySubject: "Verify your email — SHEMO PHARM",
    verifyHeading: "Verify your address",
    verifyIntro: "Hello {name}, thank you for registering with SHEMO PHARM.",
    verifyBody: "Click the button below to confirm this address belongs to you.",
    verifyButton: "Verify email",
    verifyFallback: "If the button does not work, copy this link into your browser:",
    verifyExpiry: "This link is valid for 24 hours.",
    verifyIgnore: "If you did not create this account, please ignore this message.",
    resetSubject: "Reset your password — SHEMO PHARM",
    resetHeading: "Reset your password",
    resetIntro: "Hello {name},",
    resetBody:
      "We received a request to reset the password of your account. Click the button below to choose a new one.",
    resetButton: "Choose a new password",
    resetExpiry: "This link is valid for one hour and can be used only once.",
    resetIgnore:
      "If you did not request this, ignore this message — your password stays unchanged.",
    approvedSubject: "Your account is approved — SHEMO PHARM",
    approvedHeading: "Your account is active",
    approvedIntro: "Hello {name},",
    approvedBody:
      "The SHEMO PHARM team has approved your account. Wholesale prices are now visible across the whole catalog.",
    approvedButton: "Browse products",
    footerNote:
      "SHEMO PHARM — pharmaceutical depot and wholesale distributor, Prizren, Kosovo.",
  },
};
