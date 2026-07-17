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
    quickLinks: "Quick Links",
    allCategories: "View all categories",
    loginRegister: "Log in / Register",
    accountWithName: "Account ({name})",
    homeAria: "SHEMO PHARM — Home",
    langLabel: "Language",
  },

  header: {
    trust: [
      "Licensed distributor by the Kosovo Ministry of Health",
      "2000+ products from international brands",
      "Professional advice",
    ],
    searchOpen: "Search products",
    megaPromoTitle: "Special offers",
    megaPromoText: "Special prices for pharmacies and business partners.",
    megaPromoCta: "View Offers",
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
    h1a: "Your health,",
    h1b: "our priority.",
    sub: "More than 2000 carefully selected pharmaceutical and medical products — reliable supply for pharmacies, institutions and families across Kosovo.",
    ctaProducts: "View Products",
    ctaContact: "Contact Us",
    trustLicensed: "Licensed distributor",
    trustAdvice: "Professional advice",
    trustWhatsapp: "Order via WhatsApp",
    portraitAlt: "Professional pharmacist in front of product shelves",
    depotAlt: "The SHEMO PHARM warehouse in Prizren",
    depotCaption: "Our warehouse in Prizren",
    stockValue: "2000+",
    stockLabel: "products in stock",
  },

  stats: {
    label: "Company figures",
    labels: ["Clients", "Products", "Partners and brands", "Pharmacies"],
  },

  home: {
    categoriesEyebrow: "Our catalog",
    categoriesTitle: "Popular Categories",
    featuredEyebrow: "Picked for you",
    featuredTitle: "Featured Products",
    featuredSubtitle: "A selection from our catalog",
    devicesEyebrow: "Devices",
    devicesTitle: "Medical devices and equipment",
    devicesSubtitle: "Medical technology for professional and home use",
    uspEyebrow: "Quality. Trust. Care.",
    uspTitle: "Trust built every day",
    uspSub: "Professional care, selected products and dependable service for pharmacies and partners.",
    uspLabel: "Why SHEMO PHARM",
    usp: [
      { title: "Licensed distributor", text: "By the Kosovo Ministry of Health agency" },
      { title: "Original products", text: "From well-known international brands" },
      { title: "Professional advice", text: "Our team is here for you" },
      { title: "Over 2000 products", text: "A wide selection in our catalog" },
      { title: "Supply for pharmacies", text: "A reliable wholesale partnership" },
      { title: "Easy ordering", text: "Via WhatsApp or phone" },
    ],
    adviceEyebrow: "Professional advice",
    adviceTitle1: "Professional advice",
    adviceTitle2: "whenever you need it.",
    adviceSub: "Our team is always ready to help you — professionally and without complications.",
    adviceServices: [
      "Product recommendations for your needs",
      "Availability and stock information",
      "Wholesale orders for pharmacies and institutions",
    ],
    adviceImageAlt: "The team taking a phone order and working on a computer",
    hoursTitle: "Working Hours",
    hoursDays: "Monday – Friday",
    hoursTime: "09:00 – 18:00",
    brandsEyebrow: "Our partners",
    brandsTitle: "Brands we distribute",
    brandsSub: "We work with well-known international brands",
    newsletterTitle: "Stay informed",
    newsletterSub: "Subscribe for new products and SHEMO PHARM announcements.",
    newsletterEmailLabel: "Your email address",
    newsletterPlaceholder: "Your email",
    newsletterButton: "Subscribe",
    newsletterSuccess: "Thank you! You have subscribed successfully.",
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
    contactTitle: "Contact Us",
    facebookAria: "SHEMO PHARM on Facebook",
    instagramAria: "SHEMO PHARM on Instagram",
    rights: "© {year} SHEMO PHARM. All rights reserved.",
    licensed:
      "Licensed by the Agency for Medical Products and Devices — Kosovo Ministry of Health",
  },

  product: {
    codeLabel: "Product code:",
    loginForPrice: "Log in for price",
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
    allProducts: "All products",
    categoriesHeading: "Categories",
    searchInResults: "Search within these products…",
    searchChip: "Search: “{q}”",
    categoryChip: "Category: {name}",
    removeFilter: "— remove filter",
    clearFilters: "Clear filters",
    emptyTitle: "No products found",
    emptyTextQuery:
      "We found no products for \"{q}\". Try another term or check the spelling.",
    emptyTextCategory: "This category has no products at the moment.",
    emptyTextDefault: "Try another search or browse our categories.",
    emptyAction: "View all products",
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
  },

  brandsPage: {
    title: "Brands",
    sub: "We work with well-known international brands to offer pharmacies and partners products of verified quality.",
    metaDescription:
      "International brands distributed by SHEMO PHARM: Swiss Energy, Dr. Frei, Kräuterhof, Cansin, Sudocrem and many more.",
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
    message: "Message",
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
    removeFor: "Remove {name} from the cart",
    removeWord: "Remove",
    orderGreeting: "Hello! I would like to order:",
    orderClosing: "Please confirm availability and prices. Thank you!",
    orderMailSubject: "New order from the website",
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
    newsletterInvalid: "Enter a valid email address.",
    newsletterFailed: "Subscription failed. Please try again.",
  },
};
