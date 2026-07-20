/**
 * Central, verified business data for SHEMO PHARM.
 * Every value here was taken from the existing website (shemopharm.com).
 * Fields marked TODO need confirmation from the business before going live.
 */
export const SITE = {
  name: "SHEMO PHARM",
  legalName: "Shemo Pharm",
  domain: "https://shemopharm.com",
  tagline: "Distributor me shumicë i pajisjeve dhe produkteve mjekësore",
  taglineLong:
    "Depo farmaceutike dhe distributor me shumicë i produkteve dhe pajisjeve mjekësore",
  description:
    "SHEMO PHARM është depo farmaceutike dhe distributor me shumicë i produkteve, pajisjeve mjekësore, produkteve ortopedike, suplementeve dhe artikujve të kujdesit personal në Kosovë.",

  phones: [
    { label: "+383 (0) 49 600 934", href: "tel:+38349600934" },
    { label: "+383 (0) 49 333 119", href: "tel:+38349333119" },
  ],
  // TODO: confirm which number receives WhatsApp messages (assumed 049 600 934)
  whatsapp: "https://wa.me/38349600934",
  emails: ["info@shemopharm.com", "ntp.shemo@gmail.com"],

  address: {
    street: "Rr. Ernest Koliqi 165/A",
    city: "Prizren",
    postalCode: "20000",
    country: "Kosovë",
  },
  hours: "E hënë – E premte, 09:00 – 18:00",

  social: {
    facebook: "https://www.facebook.com/shemofarm/",
    instagram: "https://www.instagram.com/shemopharmshpk/",
    // TODO: no YouTube profile could be verified — add it here once confirmed.
    youtube: null as string | null,
  },

  /** TODO: no PDF catalog exists on the old site. Set a URL (e.g. "/katalogu.pdf")
   *  once a real catalog file is available — the header button appears automatically. */
  catalogUrl: null as string | null,

  // Five discrete company figures. The physical network (3 pharmacies + 2 depots)
  // is shown as two separate stats — never as a combined "3 + 2".
  stats: [
    { value: "1200+", label: "Klientë" },
    { value: "2000+", label: "Produkte" },
    // TODO: the old site said "200+ Distributor i autorizuar" — meaning unclear.
    // Neutral wording used until the business confirms what the figure counts.
    { value: "200+", label: "Brende partnere" },
    { value: "3", label: "Barnatore" },
    { value: "2", label: "Depo" },
  ],
} as const;

export const BRANDS = [
  { name: "Swiss Energy", image: "/brands/swiss-energy.png" },
  { name: "Dr. Frei", image: "/brands/dr-frei.png" },
  { name: "Kräuterhof", image: "/brands/krauterhof.png" },
  { name: "Cansin", image: "/brands/cansin.png" },
  { name: "TIO Medikal", image: "/brands/tio-medikal.png" },
  { name: "Support Line", image: "/brands/support-line.png" },
  { name: "Comfort Plus", image: "/brands/comfort-plus.png" },
  { name: "Foot Guard", image: "/brands/foot-guard.png" },
  { name: "Sudocrem", image: "/brands/sudocrem.png" },
  { name: "Santasya", image: "/brands/santasya.png" },
  { name: "Orjinalmed", image: "/brands/orjinalmed.png" },
  { name: "NT41", image: "/brands/nt41.png" },
  { name: "Koruglu", image: "/brands/koruglu.png" },
  { name: "Iyon", image: "/brands/iyon.png" },
  { name: "Folium", image: "/brands/folium.png" },
  { name: "Bebeevan", image: "/brands/bebeevan.png" },
  { name: "Alg", image: "/brands/alg.png" },
] as const;

/**
 * Curated subset of the most recognizable partner brands shown on the homepage
 * strip (the full list stays available on /markat). Kept to ~10 so the section
 * reads calm and premium, with a consistent visual area per logo.
 */
const HOME_BRAND_NAMES = [
  "Swiss Energy",
  "Dr. Frei",
  "Kräuterhof",
  "Sudocrem",
  "TIO Medikal",
  "Cansin",
  "Folium",
  "Support Line",
  "Comfort Plus",
  "Foot Guard",
];

export const HOME_BRANDS = HOME_BRAND_NAMES.map((name) =>
  BRANDS.find((b) => b.name === name)
).filter((b): b is (typeof BRANDS)[number] => Boolean(b));
